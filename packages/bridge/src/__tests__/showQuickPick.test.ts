import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property-based tests for the showQuickPick bridge action.
 *
 * These tests validate that string normalization, item passthrough,
 * and options inclusion in the wire message work correctly.
 *
 * **Validates: Requirements 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 10.3**
 */
describe('showQuickPick bridge action — property tests', () => {
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
   * Property 1: String-to-QuickPickItem conversion preserves identity
   *
   * For any array of strings passed to showQuickPick, each string SHALL be
   * converted to a QuickPickItem where both label and value equal the original string.
   *
   * **Validates: Requirements 1.3, 7.1, 7.2**
   */
  describe('Property 1: String-to-QuickPickItem conversion preserves identity', () => {
    it('converts each string to a QuickPickItem with label and value equal to the string', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 20 }),
          async (strings) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { showQuickPick } = await import('../actions/showQuickPick.js')

            const promise = showQuickPick(strings)

            expect(postMessageMock).toHaveBeenCalledTimes(1)
            const sentMessage = postMessageMock.mock.calls[0][0]
            expect(sentMessage.type).toBe('show-quick-pick')

            const items = sentMessage.payload.items
            expect(items).toHaveLength(strings.length)

            for (let i = 0; i < strings.length; i++) {
              expect(items[i].label).toBe(strings[i])
              expect(items[i].value).toBe(strings[i])
            }

            // Resolve the pending request so it doesn't leak
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'show-quick-pick:reply',
                  payload: { selected: null },
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
   * Property 2: QuickPickItem passthrough is identity
   *
   * For any array of QuickPickItem objects passed to showQuickPick, the items
   * in the wire message payload SHALL be identical to the input array (no modification).
   *
   * **Validates: Requirements 1.4, 7.3**
   */
  describe('Property 2: QuickPickItem passthrough is identity', () => {
    it('passes QuickPickItem objects through unchanged in the wire message', async () => {
      const quickPickItemArb = fc.record(
        {
          label: fc.string({ minLength: 1 }),
          description: fc.string(),
          detail: fc.string(),
          value: fc.string(),
        },
        { requiredKeys: ['label'] },
      )

      await fc.assert(
        fc.asyncProperty(
          fc.array(quickPickItemArb, { minLength: 1, maxLength: 20 }),
          async (items) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { showQuickPick } = await import('../actions/showQuickPick.js')

            const promise = showQuickPick(items)

            expect(postMessageMock).toHaveBeenCalledTimes(1)
            const sentMessage = postMessageMock.mock.calls[0][0]
            expect(sentMessage.type).toBe('show-quick-pick')

            const sentItems = sentMessage.payload.items
            expect(sentItems).toEqual(items)

            // Resolve the pending request so it doesn't leak
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'show-quick-pick:reply',
                  payload: { selected: null },
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
   * Property 3: Options are included in wire message when provided
   *
   * For any valid QuickPickOptions object passed to showQuickPick, the wire message
   * payload SHALL contain an options field equal to the provided options object.
   *
   * **Validates: Requirements 1.5, 10.3**
   */
  describe('Property 3: Options are included in wire message when provided', () => {
    it('includes options in the wire message payload when provided', async () => {
      const optionsArb = fc.record(
        {
          placeholder: fc.string({ minLength: 1 }),
          title: fc.string({ minLength: 1 }),
          canPickMany: fc.boolean(),
        },
        { requiredKeys: [] },
      )

      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
          optionsArb,
          async (strings, options) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { showQuickPick } = await import('../actions/showQuickPick.js')

            const promise = showQuickPick(strings, options)

            expect(postMessageMock).toHaveBeenCalledTimes(1)
            const sentMessage = postMessageMock.mock.calls[0][0]
            expect(sentMessage.type).toBe('show-quick-pick')
            expect(sentMessage.payload.options).toEqual(options)

            // Resolve the pending request so it doesn't leak
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'show-quick-pick:reply',
                  payload: { selected: null },
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

    it('omits options from the wire message payload when not provided', async () => {
      vi.resetModules()
      postMessageMock = vi.fn()
      ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

      const { showQuickPick } = await import('../actions/showQuickPick.js')

      const promise = showQuickPick(['item1', 'item2'])

      expect(postMessageMock).toHaveBeenCalledTimes(1)
      const sentMessage = postMessageMock.mock.calls[0][0]
      expect(sentMessage.payload).not.toHaveProperty('options')

      // Resolve the pending request so it doesn't leak
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'show-quick-pick:reply',
            payload: { selected: null },
            correlationId: sentMessage.correlationId,
          },
        }),
      )

      await promise
    })
  })
})
