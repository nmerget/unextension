// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {{ path?: string } | null} payload
 * @param {(result: { content: string, encoding: 'utf8' }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {Promise<void>}
 */
async function readProjectFile(payload, reply, channel) {
  const filePath = payload?.path ?? ''
  const folders = vscode.workspace.workspaceFolders
  if (!folders || folders.length === 0) {
    reply({ content: '', encoding: 'utf8' })
    return
  }
  const uri = vscode.Uri.joinPath(folders[0].uri, filePath)
  const bytes = await vscode.workspace.fs.readFile(uri)
  const content = Buffer.from(bytes).toString('utf8')
  ;(channel || output).appendLine(
    '[unextension] readProjectFile: ' + filePath + ' (' + bytes.length + ' bytes)',
  )
  reply({ content, encoding: 'utf8' })
}
