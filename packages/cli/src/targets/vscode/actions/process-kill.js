// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {{ processId?: string, signal?: string } | null} payload
 * @param {(result: { success: boolean }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {void}
 */
function processKill(payload, reply, channel) {
  const processId = payload?.processId ?? ''
  const signal = payload?.signal ?? 'SIGTERM'
  const proc = processRegistry.get(processId)

  if (!proc) {
    reply({ success: false })
    return
  }

  proc.kill(signal)
  reply({ success: true })
}
