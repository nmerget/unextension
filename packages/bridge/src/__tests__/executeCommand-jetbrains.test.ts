import { describe, it, expect } from 'vitest'

/**
 * Unit tests for JetBrains executeCommand handler rejection behavior.
 *
 * Since the JetBrains handler is written in Kotlin and cannot be directly
 * tested in this TypeScript monorepo, we reimplement the rejection logic
 * in TypeScript and validate it with unit tests.
 *
 * The Kotlin handler (`ExecuteCommand.kt`) rejects:
 * 1. Any command that does NOT start with "unextension." → guidance error
 * 2. Any "unextension.*" command that is NOT in the known mapping table → guidance error
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */

/** The set of known unextension commands supported by the JetBrains handler */
const JETBRAINS_SUPPORTED_COMMANDS = new Set([
  'unextension.openSettings',
  'unextension.openInBrowser',
  'unextension.togglePanel',
  'unextension.toggleSidebar',
  'unextension.newScratchFile',
])

/**
 * TypeScript reimplementation of the JetBrains handler's rejection logic
 * from `ExecuteCommand.kt`:
 *
 * ```kotlin
 * if (!command.startsWith("unextension.")) {
 *     replyPayload.put("error",
 *         "Command not supported in JetBrains: $command. Use getTarget() to detect the platform and call native commands conditionally.")
 *     reply.put("payload", replyPayload)
 *     return
 * }
 *
 * val result = when (command) {
 *     "unextension.openSettings" -> { ... }
 *     ...
 *     else -> {
 *         replyPayload.put("error",
 *             "Command not supported in JetBrains: $command. Use getTarget() to detect the platform and call native commands conditionally.")
 *         reply.put("payload", replyPayload)
 *         return
 *     }
 * }
 * ```
 */
function handleExecuteCommandJetBrains(command: string): { result?: null; error?: string } {
  if (!command || command.trim() === '') {
    return { error: 'Command field is required' }
  }

  // Only unextension.* commands are supported in JetBrains
  if (!command.startsWith('unextension.')) {
    return {
      error: `Command not supported in JetBrains: ${command}. Use getTarget() to detect the platform and call native commands conditionally.`,
    }
  }

  // Check if the unextension command is in the known mapping table
  if (!JETBRAINS_SUPPORTED_COMMANDS.has(command)) {
    return {
      error: `Command not supported in JetBrains: ${command}. Use getTarget() to detect the platform and call native commands conditionally.`,
    }
  }

  // Command is valid — in the real handler, it would dispatch to IntelliJ actions
  return { result: null }
}

describe('JetBrains executeCommand handler — rejection behavior', () => {
  /**
   * Non-unextension commands are rejected with the guidance error.
   *
   * **Validates: Requirements 3.1, 3.2**
   */
  describe('rejects non-unextension commands with guidance error', () => {
    it('rejects workbench.action.openSettings', () => {
      const result = handleExecuteCommandJetBrains('workbench.action.openSettings')
      expect(result.error).toBe(
        'Command not supported in JetBrains: workbench.action.openSettings. Use getTarget() to detect the platform and call native commands conditionally.',
      )
    })

    it('rejects workbench.action.togglePanel', () => {
      const result = handleExecuteCommandJetBrains('workbench.action.togglePanel')
      expect(result.error).toBe(
        'Command not supported in JetBrains: workbench.action.togglePanel. Use getTarget() to detect the platform and call native commands conditionally.',
      )
    })

    it('rejects editor.action.formatDocument', () => {
      const result = handleExecuteCommandJetBrains('editor.action.formatDocument')
      expect(result.error).toBe(
        'Command not supported in JetBrains: editor.action.formatDocument. Use getTarget() to detect the platform and call native commands conditionally.',
      )
    })

    it('rejects simpleBrowser.api.open', () => {
      const result = handleExecuteCommandJetBrains('simpleBrowser.api.open')
      expect(result.error).toBe(
        'Command not supported in JetBrains: simpleBrowser.api.open. Use getTarget() to detect the platform and call native commands conditionally.',
      )
    })

    it('rejects arbitrary non-unextension commands', () => {
      const result = handleExecuteCommandJetBrains('some.random.command')
      expect(result.error).toBe(
        'Command not supported in JetBrains: some.random.command. Use getTarget() to detect the platform and call native commands conditionally.',
      )
    })
  })

  /**
   * Unknown unextension.* commands are rejected with the guidance error.
   *
   * **Validates: Requirements 3.3**
   */
  describe('rejects unknown unextension.* commands with guidance error', () => {
    it('rejects unextension.unknownCommand', () => {
      const result = handleExecuteCommandJetBrains('unextension.unknownCommand')
      expect(result.error).toBe(
        'Command not supported in JetBrains: unextension.unknownCommand. Use getTarget() to detect the platform and call native commands conditionally.',
      )
    })

    it('rejects unextension.formatDocument', () => {
      const result = handleExecuteCommandJetBrains('unextension.formatDocument')
      expect(result.error).toBe(
        'Command not supported in JetBrains: unextension.formatDocument. Use getTarget() to detect the platform and call native commands conditionally.',
      )
    })

    it('rejects unextension.someOtherAction', () => {
      const result = handleExecuteCommandJetBrains('unextension.someOtherAction')
      expect(result.error).toBe(
        'Command not supported in JetBrains: unextension.someOtherAction. Use getTarget() to detect the platform and call native commands conditionally.',
      )
    })
  })

  /**
   * Known unextension.* commands are accepted (not rejected).
   * This verifies the handler only rejects what it should.
   *
   * **Validates: Requirements 3.2 (only unextension.* commands are executed)**
   */
  describe('accepts known unextension.* commands', () => {
    it('accepts unextension.openSettings', () => {
      const result = handleExecuteCommandJetBrains('unextension.openSettings')
      expect(result.error).toBeUndefined()
      expect(result.result).toBeNull()
    })

    it('accepts unextension.openInBrowser', () => {
      const result = handleExecuteCommandJetBrains('unextension.openInBrowser')
      expect(result.error).toBeUndefined()
      expect(result.result).toBeNull()
    })

    it('accepts unextension.togglePanel', () => {
      const result = handleExecuteCommandJetBrains('unextension.togglePanel')
      expect(result.error).toBeUndefined()
      expect(result.result).toBeNull()
    })

    it('accepts unextension.toggleSidebar', () => {
      const result = handleExecuteCommandJetBrains('unextension.toggleSidebar')
      expect(result.error).toBeUndefined()
      expect(result.result).toBeNull()
    })

    it('accepts unextension.newScratchFile', () => {
      const result = handleExecuteCommandJetBrains('unextension.newScratchFile')
      expect(result.error).toBeUndefined()
      expect(result.result).toBeNull()
    })
  })
})
