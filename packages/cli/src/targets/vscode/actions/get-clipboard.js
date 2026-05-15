// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {null} payload
 * @param {(result: { text: string }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {Promise<void>}
 */
async function getClipboard(payload, reply, channel) {
  try {
    const text = await vscode.env.clipboard.readText()
    reply({ text: text ?? '' })
  } catch (e) {
    reply({ text: '', error: String(e) })
  }
}
