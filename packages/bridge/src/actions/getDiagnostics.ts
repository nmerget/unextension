import { bridge } from '../index.js'

export type Severity = 'error' | 'warning' | 'info' | 'hint'

export interface Diagnostic {
  file: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  message: string
  severity: Severity
  source?: string
}

export interface GetDiagnosticsOptions {
  path?: string
  openFilesOnly?: boolean
}

export interface GetDiagnosticsResult {
  diagnostics: Diagnostic[]
}

export async function getDiagnostics(
  options: GetDiagnosticsOptions = {},
): Promise<GetDiagnosticsResult> {
  return bridge.request<GetDiagnosticsResult>('get-diagnostics', options)
}
