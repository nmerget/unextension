// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {{ path?: string, content?: string } | null} payload
 * @param {(result: { success: boolean }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {Promise<void>}
 */
async function writeProjectFile(payload, reply, channel) {
  const filePath = payload?.path ?? ''
  const content = payload?.content ?? ''
  const folders = vscode.workspace.workspaceFolders
  if (!folders || folders.length === 0) {
    reply({ success: false })
    return
  }
  const uri = vscode.Uri.joinPath(folders[0].uri, filePath)
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'))
  ;(channel || output).appendLine(
    '[unextension] writeProjectFile: ' + filePath + ' (' + content.length + ' chars)',
  )
  reply({ success: true })
}
