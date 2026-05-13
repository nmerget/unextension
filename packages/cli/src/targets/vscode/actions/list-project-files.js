// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {{ pattern?: string } | null} payload
 * @param {(result: string[]) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {Promise<void>}
 */
async function listProjectFiles(payload, reply, channel) {
  const pattern = payload?.pattern ?? '**/*'
  const folders = vscode.workspace.workspaceFolders
  if (!folders || folders.length === 0) {
    ;(channel || output).appendLine('[unextension] listProjectFiles: no workspace folders open')
    reply([])
    return
  }
  const uris = await vscode.workspace.findFiles(
    new vscode.RelativePattern(folders[0], pattern),
    '{**/node_modules/**,**/.git/**,**/.idea/**,**/.gradle/**,**/build/**,**/out/**,**/dist/**}',
  )
  const files = uris.map((u) => vscode.workspace.asRelativePath(u, false))
  ;(channel || output).appendLine(
    '[unextension] listProjectFiles: found ' + files.length + ' file(s) for pattern ' + pattern,
  )
  reply(files)
}
