---
title: Open in Simple Browser
description: Open a URL in the IDE's built-in Simple Browser panel using @unextension/bridge.
---

The `openInSimpleBrowser` action opens a URL in the host IDE's built-in browser panel. This is a convenience wrapper around [`executeCommand`](./execute-command) that targets the `simpleBrowser.api.open` command.

```ts
import { openInSimpleBrowser } from '@unextension/bridge'
```

---

## `openInSimpleBrowser(url)`

Opens a URL in the IDE's Simple Browser panel.

```ts
const result = await openInSimpleBrowser('https://example.com')
console.log(result.success) // true
```

### Parameters

| Parameter | Type     | Required | Description                           |
| --------- | -------- | -------- | ------------------------------------- |
| `url`     | `string` | ✅       | The URL to open in the Simple Browser |

### Return value

`Promise<OpenInSimpleBrowserResult>`

| Field     | Type      | Description                             |
| --------- | --------- | --------------------------------------- |
| `success` | `boolean` | Whether the URL was opened successfully |

---

## Usage examples

### Open a URL

```ts
import { openInSimpleBrowser } from '@unextension/bridge'

const result = await openInSimpleBrowser('https://example.com')

if (result.success) {
  console.log('URL opened in Simple Browser')
} else {
  console.log('Failed to open URL')
}
```

### Open documentation alongside your extension

```ts
import { openInSimpleBrowser } from '@unextension/bridge'

async function showDocs() {
  const { success } = await openInSimpleBrowser('https://docs.example.com/api')

  if (!success) {
    console.warn('Could not open documentation')
  }
}
```

---

## Error handling

`openInSimpleBrowser` always resolves with `{ success: boolean }`. It does not reject the promise.

| Scenario                                      | Result               |
| --------------------------------------------- | -------------------- |
| URL opens successfully                        | `{ success: true }`  |
| Empty string passed as URL                    | `{ success: false }` |
| Underlying `executeCommand` throws or rejects | `{ success: false }` |
| Command blocked by allowlist                  | `{ success: false }` |

```ts
const { success } = await openInSimpleBrowser('')

if (!success) {
  console.warn('Could not open URL — check that the URL is not empty')
}
```

Empty URLs are rejected client-side without sending a message to the IDE. All other failures (network errors, command not available, allowlist restrictions) are caught internally and mapped to `{ success: false }`.

---

## Types

All types are exported from `@unextension/bridge`:

```ts
import type { OpenInSimpleBrowserResult } from '@unextension/bridge'
```

### `OpenInSimpleBrowserResult`

```ts
interface OpenInSimpleBrowserResult {
  success: boolean
}
```
