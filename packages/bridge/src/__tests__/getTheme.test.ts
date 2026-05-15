import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Unit tests for the getTheme bridge action.
 *
 * **Validates: Requirements 1.1, 1.5**
 */
describe('getTheme bridge action — unit tests', () => {
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
   * Calling `getTheme()` SHALL send a bridge message with type `'get-theme'`
   * and no payload (undefined).
   *
   * **Validates: Requirements 1.1, 1.5**
   */
  it('calls bridge.request with type "get-theme" and no payload', async () => {
    const { getTheme } = await import('../actions/getTheme.js')

    const promise = getTheme()

    // Verify the wire message
    expect(postMessageMock).toHaveBeenCalledTimes(1)
    const sentMessage = postMessageMock.mock.calls[0][0]
    expect(sentMessage.type).toBe('get-theme')
    expect(sentMessage.payload).toBeUndefined()

    // Resolve the pending request so it doesn't leak
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'get-theme:reply',
          payload: { colorScheme: 'dark', colors: {} },
          correlationId: sentMessage.correlationId,
        },
      }),
    )

    await promise
  })
})
