import { bridge } from '../index.js'

export interface ReadProjectFileResult {
  content: string
  encoding: 'utf8'
}

export async function readProjectFile(path: string): Promise<ReadProjectFileResult> {
  return bridge.request<ReadProjectFileResult>('read-project-file', { path })
}
