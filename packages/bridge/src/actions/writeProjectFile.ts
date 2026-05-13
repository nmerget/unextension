import { bridge } from '../index.js'

export interface WriteProjectFileResult {
  success: boolean
}

export async function writeProjectFile(
  path: string,
  content: string,
): Promise<WriteProjectFileResult> {
  return bridge.request<WriteProjectFileResult>('write-project-file', { path, content })
}
