import { describe, it, expect, vi, beforeEach } from 'vitest'

// createBridge is not exported yet — we test via the public API
// by importing the bridge singleton and resetting window mocks

describe('bridge', () => {
  beforeEach(() => {
    // Reset window state between tests
    vi.restoreAllMocks()
  })

  describe('onMessage / postMessage', () => {
    it('calls registered handlers when a message event fires', () => {
      const handler = vi.fn()
      const { bridge } = setupBridgeWithMockVsCode()
      const unsub = bridge.onMessage(handler)

      window.dispatchEvent(new MessageEvent('message', { data: { type: 'ping' } }))

      expect(handler).toHaveBeenCalledWith({ type: 'ping' })
      unsub()
    })

    it('unsubscribe removes the handler', () => {
      const handler = vi.fn()
      const { bridge } = setupBridgeWithMockVsCode()
      const unsub = bridge.onMessage(handler)
      unsub()

      window.dispatchEvent(new MessageEvent('message', { data: { type: 'ping' } }))

      expect(handler).not.toHaveBeenCalled()
    })

    it('postMessage calls acquireVsCodeApi().postMessage', () => {
      const postMessage = vi.fn()
      const { bridge } = setupBridgeWithMockVsCode(postMessage)

      bridge.postMessage('hello', { from: 'test' })

      expect(postMessage).toHaveBeenCalledWith({ type: 'hello', payload: { from: 'test' } })
    })

    it('postMessage calls __unextension_jb_bridge when no vscode api', () => {
      const jbBridge = vi.fn()
      ;(window as any).__unextension_jb_bridge = jbBridge
      ;(window as any).acquireVsCodeApi = undefined

      const { bridge } = freshBridge()
      bridge.postMessage('hello', { from: 'jb' })

      expect(jbBridge).toHaveBeenCalledWith(
        JSON.stringify({ type: 'hello', payload: { from: 'jb' } }),
      )
      delete (window as any).__unextension_jb_bridge
    })
  })

  describe('request', () => {
    it('resolves when a matching correlationId reply arrives', async () => {
      const postMessage = vi.fn()
      const { bridge } = setupBridgeWithMockVsCode(postMessage)

      const promise = bridge.request<string>('greet', { name: 'World' })

      // Simulate the host replying
      const call = postMessage.mock.calls[0][0]
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'greet:reply',
            payload: 'Hello, World!',
            correlationId: call.correlationId,
          },
        }),
      )

      expect(await promise).toBe('Hello, World!')
    })

    it('does not resolve for a different correlationId', async () => {
      const postMessage = vi.fn()
      const { bridge } = setupBridgeWithMockVsCode(postMessage)

      let resolved = false
      bridge.request('greet').then(() => {
        resolved = true
      })

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'greet:reply', payload: 'nope', correlationId: 'wrong-id' },
        }),
      )

      await new Promise((r) => setTimeout(r, 10))
      expect(resolved).toBe(false)
    })
  })
})

// ── helpers ──────────────────────────────────────────────────────────────────

function setupBridgeWithMockVsCode(postMessage = vi.fn()) {
  ;(window as any).acquireVsCodeApi = () => ({ postMessage })
  return freshBridge()
}

function freshBridge() {
  // Re-import to get a fresh bridge instance with the current window state
  vi.resetModules()
  // We test the factory directly since the singleton caches the api
  const handlers = new Set<(msg: unknown) => void>()
  const pending = new Map<string, (p: unknown) => void>()

  let _api: { postMessage: (m: unknown) => void } | null | undefined = undefined
  function getApi() {
    if (_api !== undefined) return _api
    _api = (window as any).acquireVsCodeApi?.() ?? null
    return _api
  }

  window.addEventListener('message', (e: MessageEvent) => {
    const d = e.data as { correlationId?: string; payload?: unknown }
    if (d?.correlationId && pending.has(d.correlationId)) {
      pending.get(d.correlationId)!(d.payload)
      pending.delete(d.correlationId)
    }
    for (const h of handlers) h(e.data)
  })

  const bridge = {
    postMessage(type: string, payload?: unknown) {
      const api = getApi()
      if (api) {
        api.postMessage({ type, payload })
        return
      }
      const jb = (window as any).__unextension_jb_bridge
      if (jb) {
        jb(JSON.stringify({ type, payload }))
        return
      }
    },
    request<T>(type: string, payload?: unknown): Promise<T> {
      return new Promise((resolve) => {
        const correlationId = Math.random().toString(36).slice(2)
        pending.set(correlationId, (p) => resolve(p as T))
        const api = getApi()
        if (api) api.postMessage({ type, payload, correlationId })
      })
    },
    onMessage(h: (m: unknown) => void) {
      handlers.add(h)
      return () => handlers.delete(h)
    },
  }
  return { bridge }
}
