import { bridge } from '../index.js'

export interface RunScriptResult {
  result: unknown
  exitCode: number
  stderr: string
}

export async function runScript(name: string, payload?: unknown): Promise<RunScriptResult> {
  return bridge.request<RunScriptResult>('run-script', { name, payload })
}
