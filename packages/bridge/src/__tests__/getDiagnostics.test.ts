import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * Unit tests for the getDiagnostics bridge action.
 *
 * **Property 1: Diagnostic structure validity**
 *
 * For any diagnostic entry returned by the getDiagnostics action, it SHALL have:
 * a non-empty `file` string, a `line` >= 1, a `column` >= 1, a non-empty `message` string,
 * a `severity` that is one of `'error' | 'warning' | 'info' | 'hint'`, and if `endLine` is
 * present then `endColumn` must also be present (and vice versa) with both >= 1, and if
 * `source` is present it must be a non-empty string.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 4.1, 4.2, 8.4**
 */
describe('getDiagnostics bridge action — unit tests', () => {
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

  describe('Function export and message type', () => {
    it('getDiagnostics is exported and callable', async () => {
      const { getDiagnostics } = await import('../actions/getDiagnostics.js')
      expect(typeof getDiagnostics).toBe('function')
    })

    it('calls bridge.request with type "get-diagnostics" and empty options by default', async () => {
      const { getDiagnostics } = await import('../actions/getDiagnostics.js')

      const promise = getDiagnostics()

      expect(postMessageMock).toHaveBeenCalledTimes(1)
      const sentMessage = postMessageMock.mock.calls[0][0]
      expect(sentMessage.type).toBe('get-diagnostics')
      expect(sentMessage.payload).toEqual({})

      // Resolve the pending request so it doesn't leak
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'get-diagnostics:reply',
            payload: { diagnostics: [] },
            correlationId: sentMessage.correlationId,
          },
        }),
      )

      await promise
    })
  })

  describe('Options forwarding', () => {
    it('passes { path } option through to the bridge message payload', async () => {
      const { getDiagnostics } = await import('../actions/getDiagnostics.js')

      const promise = getDiagnostics({ path: 'src/index.ts' })

      expect(postMessageMock).toHaveBeenCalledTimes(1)
      const sentMessage = postMessageMock.mock.calls[0][0]
      expect(sentMessage.type).toBe('get-diagnostics')
      expect(sentMessage.payload).toEqual({ path: 'src/index.ts' })

      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'get-diagnostics:reply',
            payload: { diagnostics: [] },
            correlationId: sentMessage.correlationId,
          },
        }),
      )

      await promise
    })

    it('passes { openFilesOnly: true } option through to the bridge message payload', async () => {
      const { getDiagnostics } = await import('../actions/getDiagnostics.js')

      const promise = getDiagnostics({ openFilesOnly: true })

      expect(postMessageMock).toHaveBeenCalledTimes(1)
      const sentMessage = postMessageMock.mock.calls[0][0]
      expect(sentMessage.type).toBe('get-diagnostics')
      expect(sentMessage.payload).toEqual({ openFilesOnly: true })

      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'get-diagnostics:reply',
            payload: { diagnostics: [] },
            correlationId: sentMessage.correlationId,
          },
        }),
      )

      await promise
    })

    it('passes combined options through to the bridge message payload', async () => {
      const { getDiagnostics } = await import('../actions/getDiagnostics.js')

      const promise = getDiagnostics({ path: 'src/app.ts', openFilesOnly: true })

      expect(postMessageMock).toHaveBeenCalledTimes(1)
      const sentMessage = postMessageMock.mock.calls[0][0]
      expect(sentMessage.type).toBe('get-diagnostics')
      expect(sentMessage.payload).toEqual({ path: 'src/app.ts', openFilesOnly: true })

      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'get-diagnostics:reply',
            payload: { diagnostics: [] },
            correlationId: sentMessage.correlationId,
          },
        }),
      )

      await promise
    })
  })

  describe('Property 1: Diagnostic structure validity', () => {
    const severityArb = fc.constantFrom('error', 'warning', 'info', 'hint') as fc.Arbitrary<
      'error' | 'warning' | 'info' | 'hint'
    >

    const diagnosticArb = fc.record({
      file: fc.string({ minLength: 1 }),
      line: fc.integer({ min: 1 }),
      column: fc.integer({ min: 1 }),
      message: fc.string({ minLength: 1 }),
      severity: severityArb,
    })

    const diagnosticWithEndPositionArb = fc.record({
      file: fc.string({ minLength: 1 }),
      line: fc.integer({ min: 1 }),
      column: fc.integer({ min: 1 }),
      endLine: fc.integer({ min: 1 }),
      endColumn: fc.integer({ min: 1 }),
      message: fc.string({ minLength: 1 }),
      severity: severityArb,
    })

    const diagnosticWithSourceArb = fc.record({
      file: fc.string({ minLength: 1 }),
      line: fc.integer({ min: 1 }),
      column: fc.integer({ min: 1 }),
      message: fc.string({ minLength: 1 }),
      severity: severityArb,
      source: fc.string({ minLength: 1 }),
    })

    it('resolves with diagnostics that have valid structure (required fields)', async () => {
      await fc.assert(
        fc.asyncProperty(fc.array(diagnosticArb, { maxLength: 5 }), async (diagnostics) => {
          vi.resetModules()
          postMessageMock = vi.fn()
          ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

          const { getDiagnostics } = await import('../actions/getDiagnostics.js')

          const promise = getDiagnostics()

          const call = postMessageMock.mock.calls[0][0]
          window.dispatchEvent(
            new MessageEvent('message', {
              data: {
                type: 'get-diagnostics:reply',
                payload: { diagnostics },
                correlationId: call.correlationId,
              },
            }),
          )

          const result = await promise

          for (const diag of result.diagnostics) {
            expect(diag.file.length).toBeGreaterThan(0)
            expect(diag.line).toBeGreaterThanOrEqual(1)
            expect(diag.column).toBeGreaterThanOrEqual(1)
            expect(diag.message.length).toBeGreaterThan(0)
            expect(['error', 'warning', 'info', 'hint']).toContain(diag.severity)
          }
        }),
        { numRuns: 100 },
      )
    })

    it('resolves with diagnostics that have valid endLine/endColumn (both present together)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(diagnosticWithEndPositionArb, { maxLength: 5 }),
          async (diagnostics) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { getDiagnostics } = await import('../actions/getDiagnostics.js')

            const promise = getDiagnostics()

            const call = postMessageMock.mock.calls[0][0]
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'get-diagnostics:reply',
                  payload: { diagnostics },
                  correlationId: call.correlationId,
                },
              }),
            )

            const result = await promise

            for (const diag of result.diagnostics) {
              if (diag.endLine !== undefined) {
                expect(diag.endColumn).toBeDefined()
                expect(diag.endLine).toBeGreaterThanOrEqual(1)
                expect(diag.endColumn).toBeGreaterThanOrEqual(1)
              }
              if (diag.endColumn !== undefined) {
                expect(diag.endLine).toBeDefined()
              }
            }
          },
        ),
        { numRuns: 100 },
      )
    })

    it('resolves with diagnostics that have valid source (non-empty string when present)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(diagnosticWithSourceArb, { maxLength: 5 }),
          async (diagnostics) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { getDiagnostics } = await import('../actions/getDiagnostics.js')

            const promise = getDiagnostics()

            const call = postMessageMock.mock.calls[0][0]
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'get-diagnostics:reply',
                  payload: { diagnostics },
                  correlationId: call.correlationId,
                },
              }),
            )

            const result = await promise

            for (const diag of result.diagnostics) {
              if (diag.source !== undefined) {
                expect(diag.source.length).toBeGreaterThan(0)
              }
            }
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
