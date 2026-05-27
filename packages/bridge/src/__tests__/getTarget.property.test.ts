import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property-based tests for getTarget bridge action.
 *
 * Feature: get-target-action
 *
 * These tests validate that the bridge action sends the correct wire message
 * and that the response conforms to the TargetResult schema regardless of
 * host-provided values.
 *
 * **Validates: Requirements 1.4, 2.4, 3.4, 4.4**
 */
describe('getTarget bridge action — property tests', () => {
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
   * Feature: get-target-action, Property 1: Response structure invariant
   *
   * For any string values returned by the host platform APIs (appName, version),
   * the `getTarget` response SHALL always conform to the `TargetResult` schema:
   * `target` is one of the literal strings `'vscode'` or `'jetbrains'`, `name`
   * is a non-empty string, and `version` is a non-empty string.
   *
   * **Validates: Requirements 2.4, 3.4**
   */
  describe('Property 1: Response structure invariant', () => {
    it('response always conforms to TargetResult schema for any host values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.constant('vscode' as const), fc.constant('jetbrains' as const)),
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          async (target, name, version) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { getTarget } = await import('../actions/getTarget.js')

            const promise = getTarget()

            const sentMessage = postMessageMock.mock.calls[0][0]

            // Simulate host reply with arbitrary values
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'get-target:reply',
                  payload: { target, name, version },
                  correlationId: sentMessage.correlationId,
                },
              }),
            )

            const result = await promise

            // Verify TargetResult schema
            expect(result.target).toSatisfy((t: string) => t === 'vscode' || t === 'jetbrains')
            expect(typeof result.name).toBe('string')
            expect(result.name.length).toBeGreaterThan(0)
            expect(typeof result.version).toBe('string')
            expect(result.version.length).toBeGreaterThan(0)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Feature: get-target-action, Property 2: Wire message correctness
   *
   * For any call to `getTarget()`, the bridge SHALL send exactly one message
   * with type `'get-target'` and no payload (undefined), regardless of the
   * number of prior or concurrent calls.
   *
   * **Validates: Requirements 1.4, 4.4**
   */
  describe('Property 2: Wire message correctness', () => {
    it('each getTarget() call sends exactly one message with type get-target and undefined payload', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 10 }), async (callCount) => {
          vi.resetModules()
          postMessageMock = vi.fn()
          ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

          const { getTarget } = await import('../actions/getTarget.js')

          // Make N sequential calls
          const promises: Promise<any>[] = []
          for (let i = 0; i < callCount; i++) {
            promises.push(getTarget())
          }

          // Verify exactly N messages were sent
          expect(postMessageMock).toHaveBeenCalledTimes(callCount)

          // Verify each message has type 'get-target' and undefined payload
          for (let i = 0; i < callCount; i++) {
            const sentMessage = postMessageMock.mock.calls[i][0]
            expect(sentMessage.type).toBe('get-target')
            expect(sentMessage.payload).toBeUndefined()
          }

          // Resolve all pending requests to avoid leaks
          for (let i = 0; i < callCount; i++) {
            const sentMessage = postMessageMock.mock.calls[i][0]
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'get-target:reply',
                  payload: { target: 'vscode', name: 'Test', version: '1.0.0' },
                  correlationId: sentMessage.correlationId,
                },
              }),
            )
          }

          await Promise.all(promises)
        }),
        { numRuns: 100 },
      )
    })
  })
})
