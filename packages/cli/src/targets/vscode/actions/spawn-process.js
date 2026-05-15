// @ts-check
/// <reference path="./globals.js" />

/** @type {Map<string, import('child_process').ChildProcess>} */
const processRegistry = new Map()

/**
 * @param {{ command?: string, args?: string[], cwd?: string, env?: Record<string, string> } | null} payload
 * @param {(result: { processId?: string, pid?: number, error?: string }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @param {import('vscode').Webview} webview
 * @returns {void}
 */
function spawnProcess(payload, reply, channel, webview) {
  const command = payload?.command ?? ''
  const args = payload?.args ?? []
  const options = {}

  if (payload?.cwd) options.cwd = payload.cwd
  if (payload?.env) options.env = { ...process.env, ...payload.env }

  const processId = 'proc_' + Math.random().toString(36).slice(2)

  try {
    const { spawn } = require('child_process')
    const proc = spawn(command, args, { ...options, stdio: ['pipe', 'pipe', 'pipe'] })

    if (!proc.pid) {
      reply({ error: `Failed to spawn process: ${command}` })
      return
    }

    processRegistry.set(processId, proc)
    reply({ processId, pid: proc.pid })

    proc.stdout.on('data', (chunk) => {
      webview.postMessage({
        processId,
        payload: { type: 'stdout', data: chunk.toString() },
      })
    })

    proc.stderr.on('data', (chunk) => {
      webview.postMessage({
        processId,
        payload: { type: 'stderr', data: chunk.toString() },
      })
    })

    proc.on('error', (err) => {
      webview.postMessage({
        processId,
        payload: { type: 'exit', exitCode: 1 },
      })
      processRegistry.delete(processId)
    })

    proc.on('exit', (code) => {
      webview.postMessage({
        processId,
        payload: { type: 'exit', exitCode: code ?? 1 },
      })
      processRegistry.delete(processId)
    })
  } catch (err) {
    reply({ error: err.message || 'Failed to spawn process' })
  }
}
