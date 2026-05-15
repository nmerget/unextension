import { bridge } from '../index.js'

export interface GetClipboardResult {
  text: string
}

export async function getClipboard(): Promise<GetClipboardResult> {
  return bridge.request<GetClipboardResult>('get-clipboard')
}
