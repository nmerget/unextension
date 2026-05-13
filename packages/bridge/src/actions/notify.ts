import { bridge } from '../index.js'

export type NotifyLevel = 'info' | 'warning' | 'error'

export async function notify(message: string, level: NotifyLevel = 'info'): Promise<void> {
  await bridge.request('notify', { message, level })
}
