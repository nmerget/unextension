// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {{ includeContent?: boolean } | null} payload
 * @param {(result: { relativePath: string, absolutePath: string, language: string, startLine: number, startColumn: number, endLine: number, endColumn: number, selection?: string, content?: string } | null) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {Promise<void>}
 */
async function getActiveEditor(payload, reply, channel) {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    ;(channel || output).appendLine('[unextension] getActiveEditor: no active editor')
    reply(null)
    return
  }

  const doc = editor.document
  const sel = editor.selection

  const folders = vscode.workspace.workspaceFolders
  const absolutePath = doc.uri.fsPath
  const relativePath =
    folders && folders.length > 0 ? vscode.workspace.asRelativePath(doc.uri, false) : absolutePath

  /** @type {any} */
  const result = {
    relativePath,
    absolutePath,
    language: doc.languageId,
    startLine: sel.start.line,
    startColumn: sel.start.character,
    endLine: sel.end.line,
    endColumn: sel.end.character,
  }

  if (!sel.isEmpty) {
    result.selection = doc.getText(sel)
  }

  if (payload?.includeContent) {
    result.content = doc.getText()
  }

  ;(channel || output).appendLine(
    '[unextension] getActiveEditor: ' + relativePath + ' (' + doc.languageId + ')',
  )
  reply(result)
}
