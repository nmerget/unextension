// @ts-check
/// <reference path="./globals.js" />

/** Maps unextension.* command IDs to their VS Code native equivalents */
const UNEXTENSION_COMMAND_MAP = {
  // Original commands
  'unextension.openSettings': 'workbench.action.openSettings',
  'unextension.openInBrowser': 'simpleBrowser.api.open',
  'unextension.togglePanel': 'workbench.action.togglePanel',
  'unextension.toggleSidebar': 'workbench.action.toggleSidebarVisibility',
  'unextension.newScratchFile': 'workbench.action.files.newUntitledFile',
  // Editor actions
  'unextension.formatDocument': 'editor.action.formatDocument',
  'unextension.commentLine': 'editor.action.commentLine',
  'unextension.undo': 'undo',
  'unextension.redo': 'redo',
  'unextension.selectAll': 'editor.action.selectAll',
  // Navigation
  'unextension.goToDefinition': 'editor.action.revealDefinition',
  'unextension.goToFile': 'workbench.action.quickOpen',
  'unextension.goToSymbol': 'workbench.action.gotoSymbol',
  'unextension.findInFiles': 'workbench.action.findInFiles',
  'unextension.replaceInFiles': 'workbench.action.replaceInFiles',
  // Refactoring
  'unextension.rename': 'editor.action.rename',
  'unextension.quickFix': 'editor.action.quickFix',
  // View/UI
  'unextension.toggleFullscreen': 'workbench.action.toggleFullScreen',
  'unextension.zoomIn': 'workbench.action.zoomIn',
  'unextension.zoomOut': 'workbench.action.zoomOut',
  'unextension.closeActiveEditor': 'workbench.action.closeActiveEditor',
  'unextension.closeAllEditors': 'workbench.action.closeAllEditors',
  // VCS/Git
  'unextension.gitCommit': 'git.commit',
  'unextension.gitPull': 'git.pull',
  'unextension.gitPush': 'git.push',
  // Terminal
  'unextension.newTerminal': 'workbench.action.terminal.new',
}

/**
 * @param {{ command?: string, args?: unknown[] } | null} payload
 * @param {(result: { result?: unknown, error?: string }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {Promise<void>}
 */
async function executeCommand(payload, reply, channel) {
  const command = payload?.command ?? ''
  const args = payload?.args ?? []

  if (!command) {
    reply({ error: 'Command field is required' })
    return
  }

  // Allowlist check — __UNEXTENSION_COMMANDS_ALLOW__ is injected at build time
  // When undefined, all commands are allowed
  if (
    typeof __UNEXTENSION_COMMANDS_ALLOW__ !== 'undefined' &&
    __UNEXTENSION_COMMANDS_ALLOW__ !== null
  ) {
    if (!isCommandAllowed(command, __UNEXTENSION_COMMANDS_ALLOW__)) {
      reply({ error: 'Command not allowed: ' + command })
      return
    }
  }

  // Map unextension.* commands to VS Code equivalents
  let resolvedCommand = command
  if (command.startsWith('unextension.')) {
    const mapped = UNEXTENSION_COMMAND_MAP[command]
    if (mapped) {
      resolvedCommand = mapped
    }
    // If not in the map, pass through as-is (VS Code will report "command not found")
  }

  try {
    const timeoutMs = 10000
    const result = await Promise.race([
      vscode.commands.executeCommand(resolvedCommand, ...args),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Command timed out: ' + command)), timeoutMs),
      ),
    ])
    reply({ result: result ?? null })
  } catch (err) {
    reply({ error: err.message || 'Command execution failed: ' + command })
  }
}

/**
 * @param {string} command
 * @param {string[]} allowlist
 * @returns {boolean}
 */
function isCommandAllowed(command, allowlist) {
  for (const pattern of allowlist) {
    if (matchCommandPattern(command, pattern)) return true
  }
  return false
}

/**
 * Matches a command ID against a pattern.
 * Supports exact matches and glob patterns where * matches one or more
 * characters within a single dot-separated segment.
 * @param {string} command
 * @param {string} pattern
 * @returns {boolean}
 */
function matchCommandPattern(command, pattern) {
  if (!pattern.includes('*')) return command === pattern
  // Convert glob pattern to regex: * matches [^.]+ (one or more non-dot chars)
  const regexStr = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+') + '$'
  return new RegExp(regexStr).test(command)
}
