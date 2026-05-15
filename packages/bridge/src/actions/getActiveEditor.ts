import { bridge } from '../index.js'

export interface GetActiveEditorOptions {
  includeContent?: boolean
}

export interface GetActiveEditorResult {
  relativePath: string
  absolutePath: string
  language: string
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
  selection?: string
  content?: string
}

export async function getActiveEditor(
  options: GetActiveEditorOptions = {},
): Promise<GetActiveEditorResult | null> {
  return bridge.request<GetActiveEditorResult | null>('get-active-editor', options)
}
