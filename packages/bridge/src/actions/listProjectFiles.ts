import { bridge } from '../index.js'

export interface ListProjectFilesOptions {
  /** Glob pattern to filter files, e.g. '*.ts'. Defaults to all files. */
  pattern?: string
}

export async function listProjectFiles(options: ListProjectFilesOptions = {}): Promise<string[]> {
  return bridge.request<string[]>('list-project-files', options)
}
