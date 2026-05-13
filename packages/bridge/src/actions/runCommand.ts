import { bridge } from '../index.js'

export type Shell = 'cmd' | 'powershell' | 'bash' | 'sh' | 'zsh' | 'fish'

export interface RunCommandOptions {
  /** The shell to use. Defaults to 'cmd' on Windows, 'sh' on Unix. */
  shell?: Shell
}

export interface RunCommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

export async function runCommand(
  command: string,
  options: RunCommandOptions = {},
): Promise<RunCommandResult> {
  return bridge.request<RunCommandResult>('run-command', { command, shell: options.shell })
}
