import { bridge } from '../index.js'

export interface SettingsStore<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Get current snapshot of all setting values */
  get(): T
  /** Subscribe to setting changes. Returns unsubscribe function. */
  subscribe(callback: (settings: T) => void): () => void
}

export function useSettings<T extends Record<string, unknown> = Record<string, unknown>>(
  defaults: T,
): SettingsStore<T> {
  let current: T = { ...defaults }
  const subscribers = new Set<(settings: T) => void>()

  // Listen for settings-changed push messages from IDE
  bridge.onMessage((message: unknown) => {
    const msg = message as { type?: string; payload?: unknown }
    if (msg?.type === 'settings-changed' && msg.payload) {
      current = { ...current, ...(msg.payload as Partial<T>) }
      for (const cb of subscribers) {
        cb(current)
      }
    }
  })

  // Request initial values from IDE
  bridge
    .request<T>('get-settings')
    .then((values) => {
      current = { ...current, ...values }
      for (const cb of subscribers) {
        cb(current)
      }
    })
    .catch(() => {
      console.warn('[unextension] Failed to fetch initial settings, using defaults')
    })

  return {
    get() {
      return current
    },
    subscribe(callback) {
      subscribers.add(callback)
      return () => {
        subscribers.delete(callback)
      }
    },
  }
}
