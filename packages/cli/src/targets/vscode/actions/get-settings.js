// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {null} payload
 * @param {(result: Record<string, unknown>) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {Promise<void>}
 */
async function getSettings(payload, reply, channel) {
  const config = vscode.workspace.getConfiguration(extensionName, null)
  /** @type {Record<string, unknown>} */
  const values = {}

  for (const def of settingsDefinitions) {
    values[def.key] = config.get(def.key, def.default)
  }

  ;(channel || output).appendLine('[unextension] getSettings: ' + JSON.stringify(values))
  reply(values)
}
