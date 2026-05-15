---
title: Clipboard
description: Read from and write to the system clipboard via the IDE host using @unextension/bridge.
---

The clipboard actions let your web app read from and write to the host system clipboard through the IDE. This is a text-only API with an extensible shape designed to support additional formats in the future.

```ts
import { getClipboard, setClipboard } from '@unextension/bridge'
```

---

## `getClipboard()`

Reads the current text content from the system clipboard.

```ts
const result = await getClipboard()
console.log(result.text) // 'Hello from clipboard'
```

### Parameters

None.

### Return value

`Promise<GetClipboardResult>`

| Field  | Type     | Description                                           |
| ------ | -------- | ----------------------------------------------------- |
| `text` | `string` | The clipboard text content, or `""` if empty/non-text |

---

## `setClipboard(text)`

Writes text to the system clipboard.

```ts
const result = await setClipboard('Copied by my extension!')
console.log(result.success) // true
```

### Parameters

| Parameter | Type     | Description                    |
| --------- | -------- | ------------------------------ |
| `text`    | `string` | The text to write to clipboard |

### Return value

`Promise<SetClipboardResult>`

| Field     | Type      | Description                 |
| --------- | --------- | --------------------------- |
| `success` | `boolean` | Whether the write succeeded |

---

## Error handling

The two actions handle errors differently by design:

| Scenario                      | `getClipboard`               | `setClipboard`                     |
| ----------------------------- | ---------------------------- | ---------------------------------- |
| Clipboard access denied       | Promise **rejects**          | Resolves with `{ success: false }` |
| Empty clipboard               | Resolves with `{ text: "" }` | —                                  |
| Non-text content on clipboard | Resolves with `{ text: "" }` | —                                  |

`getClipboard` rejects on access failure because there is no meaningful fallback value. `setClipboard` resolves with `{ success: false }` so callers can check the boolean without try/catch.

```ts
// Reading — use try/catch for access errors
try {
  const { text } = await getClipboard()
  console.log('Clipboard:', text)
} catch (e) {
  console.error('Cannot access clipboard:', e)
}

// Writing — check the success field
const { success } = await setClipboard('Hello')
if (!success) {
  console.warn('Failed to write to clipboard')
}
```

---

## Types

Both result types are exported from `@unextension/bridge`:

```ts
import type { GetClipboardResult, SetClipboardResult } from '@unextension/bridge'
```

### `GetClipboardResult`

```ts
interface GetClipboardResult {
  text: string
}
```

### `SetClipboardResult`

```ts
interface SetClipboardResult {
  success: boolean
}
```
