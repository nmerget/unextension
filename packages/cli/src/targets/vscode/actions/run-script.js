// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {{ name?: string, payload?: unknown } | null} payload
 * @param {(result: { result: unknown, exitCode: number, stderr: string }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {void}
 */
function runScript(payload, reply, channel) {
  const name = payload?.name ?? ''
  const scriptPayload = payload?.payload ?? null
  const scriptsDir = path.join(extensionPath, 'scripts')
  const scriptFile = path.join(scriptsDir, name.endsWith('.js') ? name : name + '.js')

  if (!fs.existsSync(scriptFile)) {
    ;(channel || output).appendLine('[unextension] runScript: script not found: ' + scriptFile)
    reply({ result: null, exitCode: 1, stderr: 'Script not found: ' + name })
    return
  }

  const input = JSON.stringify(scriptPayload ?? null)
  ;(channel || output).appendLine('[unextension] runScript: running ' + name)

  execFile(
    process.execPath,
    [scriptFile],
    { timeout: 30000, env: { ...process.env, UNEXTENSION_PAYLOAD: input } },
    (err, stdout, stderr) => {
      let result
      try {
        result = JSON.parse(stdout.trim())
      } catch {
        result = stdout.trim()
      }
      reply({ result, exitCode: err?.code ?? 0, stderr })
    },
  )
}
