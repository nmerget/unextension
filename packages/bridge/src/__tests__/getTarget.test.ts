import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Unit tests for the getTarget bridge action.
 *
 * **Validates: Requirements 1.1, 1.3, 1.4**
 */
describe('getTarget bridge action — unit tests', () => {
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
   * Calling `getTarget()` SHALL send a bridge message with type `'get-target'`
   * and no payload (undefined).
   *
   * **Validates: Requirements 1.1, 1.4**
   */
  it('calls bridge.request with type "get-target" and no payload', async () => {
    const { getTarget } = await import('../actions/getTarget.js')

    const promise = getTarget()

    // Verify the wire message
    expect(postMessageMock).toHaveBeenCalledTimes(1)
    const sentMessage = postMessageMock.mock.calls[0][0]
    expect(sentMessage.type).toBe('get-target')
    expect(sentMessage.payload).toBeUndefined()

    // Resolve the pending request so it doesn't leak
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'get-target:reply',
          payload: { target: 'vscode', name: 'Kiro', version: '1.0.0' },
          correlationId: sentMessage.correlationId,
        },
      }),
    )

    await promise
  })

  /**
   * `getTarget` and `TargetResult` SHALL be exported from the package entry point.
   *
   * **Validates: Requirements 1.3**
   */
  it('exports getTarget and TargetResult from the package entry point', async () => {
    const indexExports = await import('../index.js')

    expect(indexExports).toHaveProperty('getTarget')
    expect(typeof indexExports.getTarget).toBe('function')
  })
})
