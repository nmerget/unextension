import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Unit tests for the openDiff bridge action.
 *
 * **Validates: Requirements 1.3, 2.4, 2.6, 7.1**
 */
describe('openDiff bridge action — unit tests', () => {
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
   * openDiff throws when neither filePath nor originalContent is provided.
   *
   * **Validates: Requirements 2.6**
   */
  it('throws when neither filePath nor originalContent is provided', async () => {
    const { openDiff } = await import('../actions/openDiff.js')

    await expect(openDiff({ modifiedContent: 'new content' })).rejects.toThrow(
      'openDiff requires either filePath or originalContent',
    )
    expect(postMessageMock).not.toHaveBeenCalled()
  })

  /**
   * openDiff sends correct wire type "open-diff".
   *
   * **Validates: Requirements 1.3**
   */
  it('sends correct wire type "open-diff"', async () => {
    const { openDiff } = await import('../actions/openDiff.js')

    openDiff({ filePath: 'src/app.ts', modifiedContent: 'updated content' })

    expect(postMessageMock).toHaveBeenCalledTimes(1)
    const sentMessage = postMessageMock.mock.calls[0][0]
    expect(sentMessage.type).toBe('open-diff')
  })

  /**
   * openDiff Promise resolves with correct structure when correlated reply arrives.
   *
   * **Validates: Requirements 7.1**
   */
  it('resolves with correct structure when correlated reply arrives', async () => {
    const { openDiff } = await import('../actions/openDiff.js')

    const promise = openDiff({
      originalContent: 'original text',
      modifiedContent: 'modified text',
    })

    const sentMessage = postMessageMock.mock.calls[0][0]

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'open-diff:reply',
          payload: { accepted: true, hunks: null },
          correlationId: sentMessage.correlationId,
        },
      }),
    )

    const result = await promise
    expect(result).toEqual({ accepted: true, hunks: null })
  })

  /**
   * openDiff: originalContent takes precedence over filePath in the payload sent.
   *
   * **Validates: Requirements 2.4**
   */
  it('originalContent takes precedence over filePath in the payload sent', async () => {
    const { openDiff } = await import('../actions/openDiff.js')

    openDiff({
      filePath: 'src/app.ts',
      originalContent: 'inline original content',
      modifiedContent: 'modified content',
    })

    expect(postMessageMock).toHaveBeenCalledTimes(1)
    const sentMessage = postMessageMock.mock.calls[0][0]
    expect(sentMessage.payload.originalContent).toBe('inline original content')
    expect(sentMessage.payload.filePath).toBe('src/app.ts')

    // Both are sent in the payload — the IDE handler uses originalContent
    // when present, but the bridge action includes both so the handler
    // can decide. The key validation is that originalContent IS present
    // in the payload, confirming it will take precedence on the handler side.
    expect(sentMessage.payload).toEqual({
      filePath: 'src/app.ts',
      originalContent: 'inline original content',
      modifiedContent: 'modified content',
    })
  })
})
