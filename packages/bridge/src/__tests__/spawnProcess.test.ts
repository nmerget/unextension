import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property-based tests for the spawnProcess bridge action.
 *
 * These tests validate that send() produces the correct wire message format
 * and that exit events properly finalize the Process_Handle.
 *
 * **Validates: Requirements 2.1, 3.4, 7.7**
 */
describe('spawnProcess bridge action — property tests', () => {
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
   * Helper: Creates a ProcessHandle by mocking the spawn request/reply flow.
   * Returns the handle and the processId used.
   */
  async function createProcessHandle(processId: string, pid: number) {
    const { spawnProcess } = await import('../actions/spawnProcess.js')

    const spawnPromise = spawnProcess('test-cmd', ['--arg'])

    // Find the correlationId from the postMessage call
    expect(postMessageMock).toHaveBeenCalledTimes(1)
    const sentMessage = postMessageMock.mock.calls[0][0]
    expect(sentMessage.type).toBe('spawn-process')
    const correlationId = sentMessage.correlationId

    // Simulate the host replying with a successful spawn
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'spawn-process:reply',
          payload: { processId, pid },
          correlationId,
        },
      }),
    )

    const handle = await spawnPromise
    // Reset mock to track subsequent calls
    postMessageMock.mockClear()

    return handle
  }

  /**
   * Property 3: Send Produces Correct Wire Message
   *
   * For any valid Process_Handle and any string payload, calling `send(data)` SHALL
   * produce a `process-send` message containing the correct `processId` and the exact
   * `data` string unmodified.
   *
   * **Validates: Requirements 2.1**
   */
  describe('Property 3: Send Produces Correct Wire Message', () => {
    it('send(data) produces a process-send message with correct processId and exact data string', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a processId
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
          // Generate a pid
          fc.nat({ max: 65535 }).filter((n) => n > 0),
          // Generate arbitrary string payload to send
          fc.string(),
          async (processId, pid, data) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const handle = await createProcessHandle(processId, pid)

            // Call send with the arbitrary data
            handle.send(data)

            // Verify the wire message
            expect(postMessageMock).toHaveBeenCalledTimes(1)
            const sentMessage = postMessageMock.mock.calls[0][0]
            expect(sentMessage.type).toBe('process-send')
            expect(sentMessage.payload).toEqual({ processId, data })

            // Verify data is exactly the same string (not modified)
            expect(sentMessage.payload.data).toBe(data)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 7: Exit Finalizes Process_Handle
   *
   * For any active Process_Handle, when an exit Stream_Event with exit code C is
   * received, the `exitCode` promise SHALL resolve to C, and both the `stdout` and
   * `stderr` ReadableStreams SHALL be closed (subsequent reads return `{ done: true }`).
   *
   * **Validates: Requirements 3.4, 7.7**
   */
  describe('Property 7: Exit Finalizes Process_Handle', () => {
    it('exit event resolves exitCode to C and closes both stdout and stderr streams', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a processId
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
          // Generate a pid
          fc.nat({ max: 65535 }).filter((n) => n > 0),
          // Generate an exit code (0-255 range typical for processes)
          fc.integer({ min: 0, max: 255 }),
          async (processId, pid, exitCode) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const handle = await createProcessHandle(processId, pid)

            // Get readers before the exit event
            const stdoutReader = handle.stdout.getReader()
            const stderrReader = handle.stderr.getReader()

            // Simulate an exit stream event
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  processId,
                  payload: { type: 'exit', exitCode },
                },
              }),
            )

            // exitCode promise should resolve to C
            const resolvedExitCode = await handle.exitCode
            expect(resolvedExitCode).toBe(exitCode)

            // stdout ReadableStream should be closed
            const stdoutResult = await stdoutReader.read()
            expect(stdoutResult.done).toBe(true)

            // stderr ReadableStream should be closed
            const stderrResult = await stderrReader.read()
            expect(stderrResult.done).toBe(true)
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
