import { executeCommand } from './executeCommand.js'

export interface OpenInSimpleBrowserResult {
  success: boolean
}

export async function openInSimpleBrowser(url: string): Promise<OpenInSimpleBrowserResult> {
  if (!url || url.trim() === '') {
    return { success: false }
  }
  try {
    await executeCommand('unextension.openInBrowser', [url])
    return { success: true }
  } catch {
    return { success: false }
  }
}
