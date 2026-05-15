import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property-based tests for clipboard bridge actions.
 *
 * These tests validate that the bridge actions faithfully pass through
 * data between the caller and the wire protocol without modification.
 *
 * **Validates: Requirements 1.3, 1.5, 3.1, 3.4, 4.2, 5.1, 5.4, 7.1**
 */
describe('clipboard bridge actions — property tests', () => {
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
   * Property 1: getClipboard response passthrough
   *
   * For any string returned by the handler, `getClipboard()` resolves
   * with `{ text }` matching that exact string.
   *
   * **Validates: Requirements 1.3, 1.5, 5.1**
   */
  describe('Property 1: getClipboard response passthrough', () => {
    it('resolves with { text } matching any string returned by the handler', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (arbitraryText) => {
          vi.resetModules()
          postMessageMock = vi.fn()
          ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

          const { getClipboard } = await import('../actions/getClipboard.js')

          const promise = getClipboard()

          // The bridge sends a message; simulate the IDE handler reply
          const call = postMessageMock.mock.calls[0][0]
          window.dispatchEvent(
            new MessageEvent('message', {
              data: {
                type: 'get-clipboard:reply',
                payload: { text: arbitraryText },
                correlationId: call.correlationId,
              },
            }),
          )

          const result = await promise
          expect(result).toEqual({ text: arbitraryText })
        }),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 2: setClipboard payload preservation
   *
   * For any string passed to `setClipboard(text)`, the wire message has
   * type `set-clipboard` and payload `{ text }` equal to the input.
   *
   * **Validates: Requirements 3.1, 7.1**
   */
  describe('Property 2: setClipboard payload preservation', () => {
    it('sends wire message with type set-clipboard and payload { text } equal to input', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (arbitraryText) => {
          vi.resetModules()
          postMessageMock = vi.fn()
          ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

          const { setClipboard } = await import('../actions/setClipboard.js')

          // Start the request (don't await yet — we need to inspect the sent message)
          const promise = setClipboard(arbitraryText)

          // Verify the wire message
          expect(postMessageMock).toHaveBeenCalledTimes(1)
          const sentMessage = postMessageMock.mock.calls[0][0]
          expect(sentMessage.type).toBe('set-clipboard')
          expect(sentMessage.payload).toEqual({ text: arbitraryText })

          // Resolve the pending request so it doesn't leak
          window.dispatchEvent(
            new MessageEvent('message', {
              data: {
                type: 'set-clipboard:reply',
                payload: { success: true },
                correlationId: sentMessage.correlationId,
              },
            }),
          )

          await promise
        }),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 3: setClipboard result passthrough
   *
   * For any boolean in the handler response, `setClipboard()` resolves
   * with `{ success }` matching that boolean without rejecting.
   *
   * **Validates: Requirements 3.4, 4.2, 5.4**
   */
  describe('Property 3: setClipboard result passthrough', () => {
    it('resolves with { success } matching any boolean from the handler without rejecting', async () => {
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async (arbitrarySuccess) => {
          vi.resetModules()
          postMessageMock = vi.fn()
          ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

          const { setClipboard } = await import('../actions/setClipboard.js')

          const promise = setClipboard('any text')

          // Simulate the IDE handler reply with the arbitrary boolean
          const call = postMessageMock.mock.calls[0][0]
          window.dispatchEvent(
            new MessageEvent('message', {
              data: {
                type: 'set-clipboard:reply',
                payload: { success: arbitrarySuccess },
                correlationId: call.correlationId,
              },
            }),
          )

          const result = await promise
          expect(result).toEqual({ success: arbitrarySuccess })
        }),
        { numRuns: 100 },
      )
    })
  })
})
