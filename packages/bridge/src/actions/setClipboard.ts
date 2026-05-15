import { bridge } from '../index.js'

export interface SetClipboardResult {
  success: boolean
}

export async function setClipboard(text: string): Promise<SetClipboardResult> {
  return bridge.request<SetClipboardResult>('set-clipboard', { text })
}
