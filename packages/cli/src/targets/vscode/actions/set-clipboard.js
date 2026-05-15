// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {{ text?: string } | null} payload
 * @param {(result: { success: boolean }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {Promise<void>}
 */
async function setClipboard(payload, reply, channel) {
  const text = payload?.text ?? ''
  try {
    await vscode.env.clipboard.writeText(text)
    reply({ success: true })
  } catch (e) {
    reply({ success: false })
  }
}
