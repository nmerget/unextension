// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {{ command?: string, shell?: 'cmd' | 'powershell' | 'bash' | 'sh' | 'zsh' | 'fish' } | null} payload
 * @param {(result: { command: string, stdout: string, stderr: string, exitCode: number }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {void}
 */
function runCommand(payload, reply, channel) {
  const command = payload?.command ?? ''
  const isWin = os.platform() === 'win32'
  const requestedShell = payload?.shell
  const [shell, flag] = resolveShell(requestedShell, isWin)
  execFile(shell, [flag, command], { timeout: 30000 }, (err, stdout, stderr) => {
    reply({ command, stdout, stderr, exitCode: err?.code ?? 0 })
  })
}

/**
 * @param {string | undefined} requested
 * @param {boolean} isWin
 * @returns {[string, string]}
 */
function resolveShell(requested, isWin) {
  switch (requested) {
    case 'cmd':
      return ['cmd', '/c']
    case 'powershell':
      return ['powershell', '-Command']
    case 'bash':
      return ['bash', '-c']
    case 'sh':
      return ['sh', '-c']
    case 'zsh':
      return ['zsh', '-c']
    case 'fish':
      return ['fish', '-c']
    default:
      return isWin ? ['cmd', '/c'] : ['sh', '-c']
  }
}
