// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {{ path?: string, line?: number, column?: number, startLine?: number, startColumn?: number, endLine?: number, endColumn?: number } | null} payload
 * @param {(result: { success: boolean }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {Promise<void>}
 */
async function openFile(payload, reply, channel) {
  const filePath = payload?.path ?? ''
  const folders = vscode.workspace.workspaceFolders
  if (!folders || folders.length === 0) {
    reply({ success: false })
    return
  }
  const uri = vscode.Uri.joinPath(folders[0].uri, filePath)
  try {
    await vscode.workspace.fs.stat(uri)
  } catch {
    reply({ success: false })
    return
  }

  /** @type {import('vscode').TextDocumentShowOptions} */
  const showOptions = {}

  if (
    payload?.startLine != null &&
    payload?.startColumn != null &&
    payload?.endLine != null &&
    payload?.endColumn != null
  ) {
    const start = new vscode.Position(payload.startLine - 1, payload.startColumn - 1)
    const end = new vscode.Position(payload.endLine - 1, payload.endColumn - 1)
    showOptions.selection = new vscode.Range(start, end)
  } else if (payload?.line != null) {
    const col = (payload?.column ?? 1) - 1
    const pos = new vscode.Position(payload.line - 1, col)
    showOptions.selection = new vscode.Range(pos, pos)
  }

  const doc = await vscode.workspace.openTextDocument(uri)
  await vscode.window.showTextDocument(doc, showOptions)
  ;(channel || output).appendLine('[unextension] openFile: ' + filePath)
  reply({ success: true })
}
