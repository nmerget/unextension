// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {{ message?: string, level?: 'info' | 'warning' | 'error' } | null} payload
 * @param {(result: { shown: boolean }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {Promise<void>}
 */
async function notify(payload, reply, channel) {
  const level = payload?.level ?? 'info'
  const message = payload?.message ?? ''
  if (level === 'error') vscode.window.showErrorMessage(message)
  else if (level === 'warning') vscode.window.showWarningMessage(message)
  else vscode.window.showInformationMessage(message)
  reply({ shown: true })
}
