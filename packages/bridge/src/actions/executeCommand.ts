import { bridge } from '../index.js'

export interface ExecuteCommandResult {
  result?: unknown
  error?: string
}

export type UnextensionCommand =
  | 'unextension.openSettings'
  | 'unextension.openInBrowser'
  | 'unextension.togglePanel'
  | 'unextension.toggleSidebar'
  | 'unextension.newScratchFile'
  // Editor actions
  | 'unextension.formatDocument'
  | 'unextension.commentLine'
  | 'unextension.undo'
  | 'unextension.redo'
  | 'unextension.selectAll'
  // Navigation
  | 'unextension.goToDefinition'
  | 'unextension.goToFile'
  | 'unextension.goToSymbol'
  | 'unextension.findInFiles'
  | 'unextension.replaceInFiles'
  // Refactoring
  | 'unextension.rename'
  | 'unextension.quickFix'
  // View/UI
  | 'unextension.toggleFullscreen'
  | 'unextension.zoomIn'
  | 'unextension.zoomOut'
  | 'unextension.closeActiveEditor'
  | 'unextension.closeAllEditors'
  // VCS/Git
  | 'unextension.gitCommit'
  | 'unextension.gitPull'
  | 'unextension.gitPush'
  // Terminal
  | 'unextension.newTerminal'

export async function executeCommand(
  command: UnextensionCommand | (string & {}),
  args?: unknown[],
): Promise<ExecuteCommandResult> {
  if (!command || command.trim() === '') {
    return Promise.reject(new Error('Command ID must be a non-empty string'))
  }
  return bridge.request<ExecuteCommandResult>('execute-command', {
    command,
    args: args ?? [],
  })
}
