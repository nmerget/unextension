import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property-based tests for the openFile bridge action.
 *
 * These tests validate that the bridge action faithfully constructs the
 * payload from arguments and passes through the response unchanged.
 *
 * **Validates: Requirements 1.1, 1.4, 2.1, 3.1, 4.1**
 */
describe('openFile bridge action — property tests', () => {
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
   * Property 1: Payload construction preserves all provided options
   *
   * For any valid file path and any combination of optional position/range fields,
   * calling `openFile(path, options)` SHALL result in a `bridge.request` call with
   * type `'open-file'` and a payload object containing the `path` and all provided
   * option fields with their exact values.
   *
   * **Validates: Requirements 1.1, 3.1, 4.1**
   */
  describe('Property 1: Payload construction preserves all provided options', () => {
    it('sends type "open-file" with path and all provided options in the payload', async () => {
      const optionsArb = fc.record(
        {
          line: fc.integer({ min: 1, max: 100000 }),
          column: fc.integer({ min: 1, max: 10000 }),
          startLine: fc.integer({ min: 1, max: 100000 }),
          startColumn: fc.integer({ min: 1, max: 10000 }),
          endLine: fc.integer({ min: 1, max: 100000 }),
          endColumn: fc.integer({ min: 1, max: 10000 }),
        },
        { requiredKeys: [] },
      )

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          optionsArb,
          async (arbitraryPath, arbitraryOptions) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { openFile } = await import('../actions/openFile.js')

            const promise = openFile(arbitraryPath, arbitraryOptions)

            // Verify the wire message
            expect(postMessageMock).toHaveBeenCalledTimes(1)
            const sentMessage = postMessageMock.mock.calls[0][0]
            expect(sentMessage.type).toBe('open-file')
            expect(sentMessage.payload).toEqual({ path: arbitraryPath, ...arbitraryOptions })

            // Resolve the pending request so it doesn't leak
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'open-file:reply',
                  payload: { success: true },
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
   * Property 2: Response pass-through
   *
   * For any `{ success: boolean }` value returned by the bridge, the `openFile`
   * function SHALL resolve its Promise with that exact value unchanged.
   *
   * **Validates: Requirements 1.4, 2.1**
   */
  describe('Property 2: Response pass-through', () => {
    it('resolves with { success } matching any boolean from the handler unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async (arbitrarySuccess) => {
          vi.resetModules()
          postMessageMock = vi.fn()
          ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

          const { openFile } = await import('../actions/openFile.js')

          const promise = openFile('some/file.ts')

          // Simulate the IDE handler reply with the arbitrary boolean
          const call = postMessageMock.mock.calls[0][0]
          window.dispatchEvent(
            new MessageEvent('message', {
              data: {
                type: 'open-file:reply',
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
