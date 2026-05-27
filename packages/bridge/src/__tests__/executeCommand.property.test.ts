import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property-based tests for executeCommand and openInSimpleBrowser bridge actions.
 *
 * Feature: execute-command-action
 *
 * These tests validate that the bridge actions faithfully construct payloads,
 * handle error responses correctly, and that the openInSimpleBrowser wrapper
 * delegates and maps outcomes as specified.
 *
 * **Validates: Requirements 1.1, 1.6, 1.7, 2.4, 4.1, 4.2, 4.3, 4.4**
 */
describe('executeCommand bridge actions — property tests', () => {
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
   * Property 1: Payload construction preserves command and arguments
   *
   * For any non-empty command string and any array of arguments, calling
   * `executeCommand(command, args)` SHALL produce a `bridge.request` call
   * with type 'execute-command' and a payload containing the exact command
   * string and the exact args array unmodified.
   *
   * **Validates: Requirements 1.1, 1.6**
   */
  describe('Property 1: Payload construction preserves command and arguments', () => {
    it('sends wire message with type execute-command and payload containing exact command and args', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null))),
          async (command, args) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { executeCommand } = await import('../actions/executeCommand.js')

            // Start the request (don't await — we need to inspect the sent message)
            const promise = executeCommand(command, args)

            // Verify the wire message
            expect(postMessageMock).toHaveBeenCalledTimes(1)
            const sentMessage = postMessageMock.mock.calls[0][0]
            expect(sentMessage.type).toBe('execute-command')
            expect(sentMessage.payload).toEqual({ command, args })

            // Resolve the pending request so it doesn't leak
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'execute-command:reply',
                  payload: { result: null },
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
   * Property 2: Error responses resolve the promise (not reject)
   *
   * For any response from the bridge containing an `error` field,
   * the `executeCommand` function SHALL resolve its returned Promise
   * with that response object, not reject the Promise.
   *
   * **Validates: Requirements 1.7, 2.4**
   */
  describe('Property 2: Error responses resolve the promise (not reject)', () => {
    it('resolves with error response object instead of rejecting', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1 }), async (errorMessage) => {
          vi.resetModules()
          postMessageMock = vi.fn()
          ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

          const { executeCommand } = await import('../actions/executeCommand.js')

          const promise = executeCommand('some.command')

          // Simulate the IDE handler replying with an error response
          const sentMessage = postMessageMock.mock.calls[0][0]
          window.dispatchEvent(
            new MessageEvent('message', {
              data: {
                type: 'execute-command:reply',
                payload: { error: errorMessage },
                correlationId: sentMessage.correlationId,
              },
            }),
          )

          // The promise should resolve (not reject) with the error object
          const result = await promise
          expect(result).toEqual({ error: errorMessage })
        }),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 3: VS Code handler passes non-unextension commands through unchanged
   *
   * For any command string that does not start with "unextension.", the wire message
   * SHALL pass the command directly without any modification to the command ID or arguments.
   *
   * **Validates: Requirements 4.2**
   */
  describe('Property 3: VS Code handler passes non-unextension commands through unchanged', () => {
    it('sends wire message with the exact non-unextension command string unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .string({ minLength: 1 })
            .filter((s) => s.trim().length > 0 && !s.startsWith('unextension.')),
          fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null))),
          async (command, args) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { executeCommand } = await import('../actions/executeCommand.js')

            const promise = executeCommand(command, args)

            // Verify the wire message passes the command through unchanged
            expect(postMessageMock).toHaveBeenCalledTimes(1)
            const sentMessage = postMessageMock.mock.calls[0][0]
            expect(sentMessage.type).toBe('execute-command')
            expect(sentMessage.payload.command).toBe(command)
            expect(sentMessage.payload.args).toEqual(args)

            // Resolve the pending request so it doesn't leak
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'execute-command:reply',
                  payload: { result: null },
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
   * Property 6: openInSimpleBrowser sends unextension.openInBrowser with URL argument
   *
   * For any non-empty, non-whitespace URL string, calling `openInSimpleBrowser(url)`
   * SHALL produce a wire message with command `"unextension.openInBrowser"` and
   * args `[url]`.
   *
   * **Validates: Requirements 6.1, 6.2**
   */
  describe('Property 6: openInSimpleBrowser sends unextension.openInBrowser with URL argument', () => {
    it('calls executeCommand with unextension.openInBrowser and [url]', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          async (url) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { openInSimpleBrowser } = await import('../actions/openInSimpleBrowser.js')

            const promise = openInSimpleBrowser(url)

            // Verify the wire message sent by executeCommand
            expect(postMessageMock).toHaveBeenCalledTimes(1)
            const sentMessage = postMessageMock.mock.calls[0][0]
            expect(sentMessage.type).toBe('execute-command')
            expect(sentMessage.payload).toEqual({
              command: 'unextension.openInBrowser',
              args: [url],
            })

            // Resolve the pending request
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'execute-command:reply',
                  payload: { result: null },
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
   * Property 7: openInSimpleBrowser rejects empty and whitespace-only URLs
   *
   * For any string that is empty or composed entirely of whitespace characters
   * (spaces, tabs, newlines), calling `openInSimpleBrowser(url)` SHALL return
   * `{ success: false }` without sending any wire message.
   *
   * **Validates: Requirements 6.3**
   */
  describe('Property 7: openInSimpleBrowser rejects empty and whitespace-only URLs', () => {
    it('returns { success: false } for empty string without sending a wire message', async () => {
      vi.resetModules()
      postMessageMock = vi.fn()
      ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

      const { openInSimpleBrowser } = await import('../actions/openInSimpleBrowser.js')

      const result = await openInSimpleBrowser('')
      expect(result).toEqual({ success: false })
      expect(postMessageMock).not.toHaveBeenCalled()
    })

    it('returns { success: false } for any whitespace-only string without sending a wire message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), {
              minLength: 1,
              maxLength: 50,
            })
            .map((chars) => chars.join('')),
          async (whitespaceUrl) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { openInSimpleBrowser } = await import('../actions/openInSimpleBrowser.js')

            const result = await openInSimpleBrowser(whitespaceUrl)
            expect(result).toEqual({ success: false })
            expect(postMessageMock).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 6: openInSimpleBrowser maps outcomes to success boolean
   *
   * For any outcome of the underlying `executeCommand` call,
   * `openInSimpleBrowser` SHALL resolve with `{ success: true }` when
   * `executeCommand` completes without throwing, and `{ success: false }`
   * when `executeCommand` throws or rejects.
   *
   * **Validates: Requirements 4.2, 4.3, 4.4**
   */
  describe('Property 6: openInSimpleBrowser maps outcomes to success boolean', () => {
    it('maps successful executeCommand resolution to { success: true }', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          async (url) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { openInSimpleBrowser } = await import('../actions/openInSimpleBrowser.js')

            const promise = openInSimpleBrowser(url)

            // Simulate successful reply from the IDE handler
            const sentMessage = postMessageMock.mock.calls[0][0]
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'execute-command:reply',
                  payload: { result: null },
                  correlationId: sentMessage.correlationId,
                },
              }),
            )

            const result = await promise
            expect(result).toEqual({ success: true })
          },
        ),
        { numRuns: 100 },
      )
    })

    it('maps executeCommand rejection to { success: false }', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          fc.string({ minLength: 1 }),
          async (url, errorMessage) => {
            vi.resetModules()

            // Mock the executeCommand module to reject
            vi.doMock('../actions/executeCommand.js', () => ({
              executeCommand: vi.fn().mockRejectedValue(new Error(errorMessage)),
            }))

            const { openInSimpleBrowser } = await import('../actions/openInSimpleBrowser.js')

            const result = await openInSimpleBrowser(url)
            expect(result).toEqual({ success: false })
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
