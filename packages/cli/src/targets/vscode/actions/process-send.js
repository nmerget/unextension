// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {{ processId?: string, data?: string } | null} payload
 * @param {(result: { success: boolean }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {void}
 */
function processSend(payload, reply, channel) {
  const processId = payload?.processId ?? ''
  const data = payload?.data ?? ''
  const proc = processRegistry.get(processId)

  if (!proc || !proc.stdin) {
    reply({ success: false })
    return
  }

  proc.stdin.write(data)
  reply({ success: true })
}
