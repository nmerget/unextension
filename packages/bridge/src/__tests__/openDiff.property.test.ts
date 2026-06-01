import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property-based tests for the openDiff bridge action.
 *
 * Feature: native-diff-rendering
 *
 * These tests validate that the openDiff bridge action correctly sends
 * the wire type, validates payloads, and that replies are always definitive.
 *
 * **Validates: Requirements 1.3, 2.6, 7.5**
 */
describe('openDiff bridge action — property tests', () => {
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
   * Property 1: Wire type consistency
   *
   * For any valid OpenDiffPayload (containing at least one of filePath or
   * originalContent, plus modifiedContent), calling openDiff SHALL always
   * send a bridge message with wire type `open-diff`.
   *
   * **Validates: Requirements 1.3**
   */
  describe('Property 1: Wire type consistency', () => {
    it('sends wire type open-diff for any valid payload with filePath', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          fc.string(),
          fc.option(fc.string(), { nil: undefined }),
          fc.option(fc.boolean(), { nil: undefined }),
          async (filePath, modifiedContent, title, autoApply) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { openDiff } = await import('../actions/openDiff.js')

            const payload: any = { filePath, modifiedContent }
            if (title !== undefined) payload.title = title
            if (autoApply !== undefined) payload.autoApply = autoApply

            const promise = openDiff(payload)

            expect(postMessageMock).toHaveBeenCalledTimes(1)
            const sentMessage = postMessageMock.mock.calls[0][0]
            expect(sentMessage.type).toBe('open-diff')

            // Resolve the pending request so it doesn't leak
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'open-diff:reply',
                  payload: { accepted: true, hunks: null },
                  correlationId: sentMessage.correlationId,
                },
              }),
            )

            await promise
          },
        ),
        { numRuns: 100 },
      )
    })

    it('sends wire type open-diff for any valid payload with originalContent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string(),
          fc.option(fc.string(), { nil: undefined }),
          fc.option(fc.boolean(), { nil: undefined }),
          async (originalContent, modifiedContent, title, autoApply) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { openDiff } = await import('../actions/openDiff.js')

            const payload: any = { originalContent, modifiedContent }
            if (title !== undefined) payload.title = title
            if (autoApply !== undefined) payload.autoApply = autoApply

            const promise = openDiff(payload)

            expect(postMessageMock).toHaveBeenCalledTimes(1)
            const sentMessage = postMessageMock.mock.calls[0][0]
            expect(sentMessage.type).toBe('open-diff')

            // Resolve the pending request so it doesn't leak
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'open-diff:reply',
                  payload: { accepted: true, hunks: null },
                  correlationId: sentMessage.correlationId,
                },
              }),
            )

            await promise
          },
        ),
        { numRuns: 100 },
      )
    })

    it('sends wire type open-diff for any valid payload with both filePath and originalContent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          fc.string({ minLength: 1 }),
          fc.string(),
          async (filePath, originalContent, modifiedContent) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { openDiff } = await import('../actions/openDiff.js')

            const promise = openDiff({ filePath, originalContent, modifiedContent })

            expect(postMessageMock).toHaveBeenCalledTimes(1)
            const sentMessage = postMessageMock.mock.calls[0][0]
            expect(sentMessage.type).toBe('open-diff')

            // Resolve the pending request so it doesn't leak
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'open-diff:reply',
                  payload: { accepted: true, hunks: null },
                  correlationId: sentMessage.correlationId,
                },
              }),
            )

            await promise
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 3: Missing content sources produce error
   *
   * For any payload where both filePath and originalContent are absent
   * (undefined or empty string), calling openDiff SHALL reject with an error
   * without sending a message to the IDE.
   *
   * **Validates: Requirements 2.6**
   */
  describe('Property 3: Missing content sources produce error', () => {
    it('rejects when both filePath and originalContent are undefined', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          fc.option(fc.string(), { nil: undefined }),
          fc.option(fc.boolean(), { nil: undefined }),
          async (modifiedContent, title, autoApply) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { openDiff } = await import('../actions/openDiff.js')

            const payload: any = { modifiedContent }
            if (title !== undefined) payload.title = title
            if (autoApply !== undefined) payload.autoApply = autoApply

            await expect(openDiff(payload)).rejects.toThrow(
              'openDiff requires either filePath or originalContent',
            )
            expect(postMessageMock).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    })

    it('rejects when filePath is empty string and originalContent is undefined', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (modifiedContent) => {
          vi.resetModules()
          postMessageMock = vi.fn()
          ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

          const { openDiff } = await import('../actions/openDiff.js')

          await expect(openDiff({ filePath: '', modifiedContent })).rejects.toThrow(
            'openDiff requires either filePath or originalContent',
          )
          expect(postMessageMock).not.toHaveBeenCalled()
        }),
        { numRuns: 100 },
      )
    })

    it('rejects when originalContent is empty string and filePath is undefined', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (modifiedContent) => {
          vi.resetModules()
          postMessageMock = vi.fn()
          ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

          const { openDiff } = await import('../actions/openDiff.js')

          await expect(openDiff({ originalContent: '', modifiedContent })).rejects.toThrow(
            'openDiff requires either filePath or originalContent',
          )
          expect(postMessageMock).not.toHaveBeenCalled()
        }),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 6: Reply is always a definitive decision
   *
   * For any OpenDiffResult returned by the bridge, the `accepted` property
   * SHALL be strictly true or false (a boolean), never undefined, null,
   * or any other value.
   *
   * **Validates: Requirements 7.5**
   */
  describe('Property 6: Reply is always a definitive decision', () => {
    it('resolves with accepted as strictly boolean for any reply', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          fc.option(
            fc.array(
              fc.record({
                index: fc.nat(),
                accepted: fc.boolean(),
              }),
              { minLength: 1 },
            ),
            { nil: null },
          ),
          fc.option(fc.string(), { nil: undefined }),
          async (accepted, hunks, content) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { openDiff } = await import('../actions/openDiff.js')

            const promise = openDiff({
              filePath: '/some/file.ts',
              modifiedContent: 'modified',
            })

            const sentMessage = postMessageMock.mock.calls[0][0]

            const replyPayload: any = { accepted, hunks }
            if (content !== undefined) replyPayload.content = content

            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'open-diff:reply',
                  payload: replyPayload,
                  correlationId: sentMessage.correlationId,
                },
              }),
            )

            const result = await promise
            expect(typeof result.accepted).toBe('boolean')
            expect(result.accepted === true || result.accepted === false).toBe(true)
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
