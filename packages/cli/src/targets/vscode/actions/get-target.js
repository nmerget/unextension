// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {null} payload
 * @param {(result: { target: 'vscode', name: string, version: string }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {Promise<void>}
 */
async function getTarget(payload, reply, channel) {
  const name = vscode.env.appName
  const version = vscode.version
  ;(channel || output).appendLine(`[unextension] getTarget: ${name} ${version}`)
  reply({ target: 'vscode', name, version })
}
