---
title: Settings
description: Access and reactively subscribe to IDE settings from your web app using @unextension/bridge.
---

The `useSettings` action creates a reactive store that provides access to your extension's settings as configured in the IDE. It automatically syncs when the user changes settings in VS Code or JetBrains.

```ts
import { useSettings } from '@unextension/bridge'
```

---

## `useSettings(defaults)`

Creates a reactive settings store initialized with the provided default values. The store automatically fetches current values from the IDE and subscribes to future changes.

```ts
const settings = useSettings({
  'editor.fontSize': 14,
  'editor.wordWrap': true,
  'theme.mode': 'dark',
})

console.log(settings.get()) // { 'editor.fontSize': 14, 'editor.wordWrap': true, 'theme.mode': 'dark' }
```

### Parameters

| Parameter  | Type                      | Required | Description                                               |
| ---------- | ------------------------- | -------- | --------------------------------------------------------- |
| `defaults` | `Record<string, unknown>` | ✅       | Default values for all settings, used before IDE responds |

### Return value

`SettingsStore<T>`

---

## `SettingsStore<T>`

The reactive store object returned by `useSettings()`.

| Method      | Signature                                         | Description                                                     |
| ----------- | ------------------------------------------------- | --------------------------------------------------------------- |
| `get()`     | `() => T`                                         | Returns the current snapshot of all setting values              |
| `subscribe` | `(callback: (settings: T) => void) => () => void` | Subscribes to setting changes. Returns an unsubscribe function. |

---

## Usage examples

### Basic usage

```ts
import { useSettings } from '@unextension/bridge'

interface MySettings {
  'editor.fontSize': number
  'editor.wordWrap': boolean
  'general.language': string
}

const settings = useSettings<MySettings>({
  'editor.fontSize': 14,
  'editor.wordWrap': true,
  'general.language': 'en',
})

// Read current values
const current = settings.get()
console.log(current['editor.fontSize']) // 14
```

### Reactive subscription

Subscribe to be notified whenever settings change in the IDE:

```ts
import { useSettings } from '@unextension/bridge'

const settings = useSettings({
  'editor.fontSize': 14,
  'theme.mode': 'dark',
})

// Subscribe to changes
const unsubscribe = settings.subscribe((updated) => {
  console.log('Settings changed:', updated)
  document.documentElement.style.fontSize = `${updated['editor.fontSize']}px`
})

// Later, when you no longer need updates:
unsubscribe()
```

### Using with React

```ts
import { useEffect, useState } from 'react'
import { useSettings } from '@unextension/bridge'

const settingsStore = useSettings({
  'editor.fontSize': 14,
  'theme.mode': 'dark',
})

function App() {
  const [settings, setSettings] = useState(settingsStore.get())

  useEffect(() => {
    const unsubscribe = settingsStore.subscribe(setSettings)
    return unsubscribe
  }, [])

  return <div style={{ fontSize: settings['editor.fontSize'] }}>Hello</div>
}
```

---

## Default values behavior

When `useSettings()` is called, the store is immediately populated with the provided default values. This means `get()` returns usable values right away, even before the IDE responds with the actual persisted settings.

Once the IDE responds to the initial `get-settings` request, the store merges the IDE values with the defaults. Any settings not returned by the IDE will retain their default values.

```ts
const settings = useSettings({
  'editor.fontSize': 14,
  'editor.wordWrap': true,
})

// Immediately available with defaults
console.log(settings.get()) // { 'editor.fontSize': 14, 'editor.wordWrap': true }

// After IDE responds (e.g. user changed fontSize to 16):
// settings.get() → { 'editor.fontSize': 16, 'editor.wordWrap': true }
```

---

## Bridge unavailable behavior

If the bridge connection is unavailable (e.g., running outside an IDE webview), `useSettings()` still returns a functional store with the default values. A warning is logged to the console:

```
[unextension] Failed to fetch initial settings, using defaults
```

This makes it safe to use `useSettings()` during development or testing without a live IDE connection.

---

## Types

All types are exported from `@unextension/bridge`:

```ts
import type { SettingsStore } from '@unextension/bridge'
```

### `SettingsStore<T>`

```ts
interface SettingsStore<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Get current snapshot of all setting values */
  get(): T
  /** Subscribe to setting changes. Returns unsubscribe function. */
  subscribe(callback: (settings: T) => void): () => void
}
```
