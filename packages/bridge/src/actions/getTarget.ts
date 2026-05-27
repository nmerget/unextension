import { bridge } from '../index.js'

export interface TargetResult {
  target: 'vscode' | 'jetbrains'
  name: string
  version: string
}

export async function getTarget(): Promise<TargetResult> {
  return bridge.request<TargetResult>('get-target')
}
