type MessageHandler = (message: unknown) => void

interface Bridge {
  postMessage(type: string, payload?: unknown): void
  onMessage(handler: MessageHandler): () => void
}

function createBridge(): Bridge {
  const handlers = new Set<MessageHandler>()
  // Lazily acquire the VS Code API to avoid issues with SSR/prerender
  // acquireVsCodeApi() can only be called once — cache the result
  let _vscodeApi: { postMessage: (msg: unknown) => void } | undefined | null = undefined

  function getVsCodeApi() {
    if (_vscodeApi !== undefined) return _vscodeApi
    _vscodeApi = typeof window !== 'undefined'
      ? (window as any).acquireVsCodeApi?.()
      : null
    return _vscodeApi ?? null
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('message', (event) => {
      for (const handler of handlers) {
        handler(event.data)
      }
    })
  }

  return {
    postMessage(type, payload) {
      if (typeof window === 'undefined') return

      const vscodeApi = getVsCodeApi()
      if (vscodeApi) {
        vscodeApi.postMessage({ type, payload })
        return
      }

      const jbBridge = (window as any).__unextension_jb_bridge
      if (jbBridge) {
        jbBridge(JSON.stringify({ type, payload }))
        return
      }

      console.warn('[unextension] No bridge available')
    },

    onMessage(handler) {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
  }
}

export const bridge = createBridge()
export { type Bridge, type MessageHandler }
