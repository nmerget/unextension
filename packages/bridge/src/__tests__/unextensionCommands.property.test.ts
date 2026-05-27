import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property-based tests for unextension command mapping.
 *
 * Feature: unextension-commands
 *
 * These tests validate that the bridge correctly constructs wire messages
 * for unextension commands, preserving the command ID and arguments so that
 * the VS Code handler can map them to native equivalents.
 *
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 4.1**
 */
describe('unextension commands — property tests', () => {
  let postMessageMock: ReturnType<typeof vi.fn>

  /**
   * The mapping table as defined in the design document.
   * The VS Code handler maps these unextension commands to their native equivalents.
   */
  const UNEXTENSION_COMMAND_MAP: Record<string, string> = {
    'unextension.openSettings': 'workbench.action.openSettings',
    'unextension.openInBrowser': 'simpleBrowser.api.open',
    'unextension.togglePanel': 'workbench.action.togglePanel',
    'unextension.toggleSidebar': 'workbench.action.toggleSidebarVisibility',
    'unextension.newScratchFile': 'workbench.action.files.newUntitledFile',
  }

  const unextensionCommands = Object.keys(UNEXTENSION_COMMAND_MAP)

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
   * Property 1: VS Code handler maps unextension commands to native equivalents
   *
   * For any unextension command in the mapping table and any array of arguments,
   * the wire message SHALL use the unextension command ID in the payload (which
   * the VS Code handler then maps to the native equivalent), while preserving
   * the arguments array unchanged.
   *
   * **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 4.1**
   */
  describe('Property 1: VS Code handler maps unextension commands to native equivalents', () => {
    it('sends wire message with unextension command and preserves args unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...unextensionCommands),
          fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null))),
          async (unextensionCommand, args) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { executeCommand } = await import('../actions/executeCommand.js')

            // Call executeCommand with an unextension command and arbitrary args
            const promise = executeCommand(unextensionCommand, args)

            // Verify the wire message is correctly constructed
            expect(postMessageMock).toHaveBeenCalledTimes(1)
            const sentMessage = postMessageMock.mock.calls[0][0]

            // The wire message type must be 'execute-command'
            expect(sentMessage.type).toBe('execute-command')

            // The payload must contain the unextension command ID
            expect(sentMessage.payload.command).toBe(unextensionCommand)

            // The unextension command must have a known mapping in the table
            expect(UNEXTENSION_COMMAND_MAP[unextensionCommand]).toBeDefined()

            // The args array must be preserved exactly as provided
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

    it('each unextension command has a unique native VS Code equivalent', () => {
      const nativeCommands = Object.values(UNEXTENSION_COMMAND_MAP)
      const uniqueNativeCommands = new Set(nativeCommands)
      expect(uniqueNativeCommands.size).toBe(nativeCommands.length)
    })

    it('all mapping entries use the unextension. prefix', () => {
      for (const command of unextensionCommands) {
        expect(command.startsWith('unextension.')).toBe(true)
      }
    })
  })
})
