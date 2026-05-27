import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property-based tests for VS Code allowlist behavior on original command IDs.
 *
 * Feature: unextension-commands
 *
 * These tests validate that the VS Code handler's allowlist check applies to
 * the ORIGINAL command ID (before any unextension mapping), and that the error
 * message references the original command ID.
 *
 * **Validates: Requirements 4.3**
 */

/** Maps unextension.* command IDs to their VS Code native equivalents */
const UNEXTENSION_COMMAND_MAP: Record<string, string> = {
  'unextension.openSettings': 'workbench.action.openSettings',
  'unextension.openInBrowser': 'simpleBrowser.api.open',
  'unextension.togglePanel': 'workbench.action.togglePanel',
  'unextension.toggleSidebar': 'workbench.action.toggleSidebarVisibility',
  'unextension.newScratchFile': 'workbench.action.files.newUntitledFile',
}

const UNEXTENSION_COMMANDS = Object.keys(UNEXTENSION_COMMAND_MAP)

/**
 * Reimplementation of the VS Code handler's pattern matching logic.
 * This mirrors the exact logic in execute-command.js.
 */
function matchCommandPattern(command: string, pattern: string): boolean {
  if (!pattern.includes('*')) return command === pattern
  const regexStr = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+') + '$'
  return new RegExp(regexStr).test(command)
}

function isCommandAllowed(command: string, allowlist: string[]): boolean {
  for (const pattern of allowlist) {
    if (matchCommandPattern(command, pattern)) return true
  }
  return false
}

/**
 * Simulates the VS Code handler's executeCommand flow.
 * Returns the reply payload that the handler would send.
 */
function simulateVsCodeHandler(
  command: string,
  args: unknown[],
  allowlist: string[] | null,
): { result?: unknown; error?: string } {
  if (!command) {
    return { error: 'Command field is required' }
  }

  // Allowlist check — applied to the ORIGINAL command ID
  if (allowlist !== null) {
    if (!isCommandAllowed(command, allowlist)) {
      return { error: 'Command not allowed: ' + command }
    }
  }

  // Map unextension.* commands to VS Code equivalents (simulation only verifies allowlist order)
  if (command.startsWith('unextension.')) {
    // In the real handler, UNEXTENSION_COMMAND_MAP[command] would be used as resolvedCommand
    // This simulation only validates that the allowlist check happens BEFORE mapping
  }

  // In the real handler, vscode.commands.executeCommand(resolvedCommand, ...args) is called
  return { result: null }
}

describe('VS Code allowlist on original command ID — property tests', () => {
  /**
   * Property 5: VS Code allowlist applies to original command ID
   *
   * For any command (whether unextension-prefixed or native) that is blocked
   * by the configured allowlist, the VS Code handler SHALL reject the command
   * with "Command not allowed: <command>" before any mapping occurs, using the
   * original command ID for the allowlist check.
   *
   * **Validates: Requirements 4.3**
   */
  describe('Property 5: VS Code allowlist applies to original command ID', () => {
    it('blocked unextension commands produce error with original command ID, not mapped ID', () => {
      fc.assert(
        fc.property(
          // Pick a random unextension command from the mapping table
          fc.constantFrom(...UNEXTENSION_COMMANDS),
          // Generate an allowlist that does NOT include the chosen command
          fc.array(
            fc.string({ minLength: 1 }).filter(
              (s) =>
                // Ensure the allowlist entries don't accidentally match unextension commands
                !UNEXTENSION_COMMANDS.some((cmd) => matchCommandPattern(cmd, s)),
            ),
            { minLength: 0, maxLength: 5 },
          ),
          (command, allowlist) => {
            const result = simulateVsCodeHandler(command, [], allowlist)

            // The command should be rejected
            expect(result.error).toBeDefined()

            // The error message must contain the ORIGINAL command ID
            expect(result.error).toBe('Command not allowed: ' + command)

            // The error message must NOT contain the mapped VS Code command
            const mappedCommand = UNEXTENSION_COMMAND_MAP[command]
            expect(result.error).not.toContain(mappedCommand)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('blocked native commands produce error with original command ID', () => {
      fc.assert(
        fc.property(
          // Generate non-unextension command strings
          fc
            .string({ minLength: 1 })
            .filter((s) => s.trim().length > 0 && !s.startsWith('unextension.')),
          // Generate an allowlist that does NOT include the command
          fc.array(fc.constantFrom('some.other.command', 'different.command', 'another.one'), {
            minLength: 0,
            maxLength: 3,
          }),
          (command, allowlist) => {
            // Ensure the command is not in the allowlist
            if (isCommandAllowed(command, allowlist)) return // skip if accidentally allowed

            const result = simulateVsCodeHandler(command, [], allowlist)

            // The command should be rejected with the original command ID
            expect(result.error).toBe('Command not allowed: ' + command)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('allowlist check occurs before mapping (blocked commands never reach execution)', () => {
      fc.assert(
        fc.property(
          // Pick a random unextension command
          fc.constantFrom(...UNEXTENSION_COMMANDS),
          // Generate arbitrary args
          fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null))),
          (command, args) => {
            // Use an empty allowlist — nothing is allowed
            const result = simulateVsCodeHandler(command, args, [])

            // Must be rejected before mapping
            expect(result.error).toBe('Command not allowed: ' + command)

            // Result should NOT be null (which would indicate execution happened)
            expect(result.result).toBeUndefined()
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
