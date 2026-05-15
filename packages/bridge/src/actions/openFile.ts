import { bridge } from '../index.js'

export interface OpenFileOptions {
  /** Line number to place the cursor (1-based). */
  line?: number
  /** Column number to place the cursor (1-based). */
  column?: number
  /** Start line of a text selection (1-based). */
  startLine?: number
  /** Start column of a text selection (1-based). */
  startColumn?: number
  /** End line of a text selection (1-based). */
  endLine?: number
  /** End column of a text selection (1-based). */
  endColumn?: number
}

export interface OpenFileResult {
  success: boolean
}

export async function openFile(
  path: string,
  options: OpenFileOptions = {},
): Promise<OpenFileResult> {
  return bridge.request<OpenFileResult>('open-file', { path, ...options })
}
