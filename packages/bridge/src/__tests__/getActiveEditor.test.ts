import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Unit tests for the getActiveEditor bridge action.
 *
 * **Validates: Requirements 1.1, 5.1**
 */
describe('getActiveEditor bridge action — unit tests', () => {
  let postMessageMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    postMessageMock = vi.fn()
    ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete (window as any).acquireVsCodeApi
  })

  /**
   * Property 1: Message type correctness
   *
   * Calling `getActiveEditor()` SHALL send a bridge message with type `'get-active-editor'`.
   *
   * **Validates: Requirements 1.1**
   */
  describe('Property 1: Message type correctness', () => {
    it('calls bridge.request with type "get-active-editor" and empty options', async () => {
      const { getActiveEditor } = await import('../actions/getActiveEditor.js')

      const promise = getActiveEditor()

      // Verify the wire message
      expect(postMessageMock).toHaveBeenCalledTimes(1)
      const sentMessage = postMessageMock.mock.calls[0][0]
      expect(sentMessage.type).toBe('get-active-editor')
      expect(sentMessage.payload).toEqual({})

      // Resolve the pending request so it doesn't leak
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'get-active-editor:reply',
            payload: null,
            correlationId: sentMessage.correlationId,
          },
        }),
      )

      await promise
    })
  })

  /**
   * Property 4: Options forwarding
   *
   * Calling `getActiveEditor({ includeContent: true })` SHALL pass the options
   * through to the bridge message payload.
   *
   * **Validates: Requirements 5.1**
   */
  describe('Property 4: Options forwarding', () => {
    it('passes { includeContent: true } through to the bridge message payload', async () => {
      const { getActiveEditor } = await import('../actions/getActiveEditor.js')

      const promise = getActiveEditor({ includeContent: true })

      // Verify the wire message
      expect(postMessageMock).toHaveBeenCalledTimes(1)
      const sentMessage = postMessageMock.mock.calls[0][0]
      expect(sentMessage.type).toBe('get-active-editor')
      expect(sentMessage.payload).toEqual({ includeContent: true })

      // Resolve the pending request so it doesn't leak
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'get-active-editor:reply',
            payload: null,
            correlationId: sentMessage.correlationId,
          },
        }),
      )

      await promise
    })
  })
})
