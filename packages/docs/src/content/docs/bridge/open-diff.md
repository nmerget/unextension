---
title: openDiff
description: Open the IDE's native diff editor and await user accept/reject decisions using @unextension/bridge.
---

The `openDiff` action opens the host IDE's native diff editor and returns a Promise that resolves when the user explicitly accepts or rejects the proposed changes. This is a **long-lived request** — the Promise remains pending until the user acts, similar to how `spawnProcess` defers its reply until the process exits.

```ts
import { openDiff } from '@unextension/bridge'
```

---

## `openDiff(payload)`

Opens a diff editor showing the original content alongside the proposed modified content. The returned Promise resolves only when the user clicks Accept or Reject.

```ts
const result = await openDiff({
  filePath: 'src/app.ts',
  modifiedContent: 'const greeting = "hello, world!";\n',
})
console.log(result.accepted) // true or false
```

### Parameters

| Parameter | Type              | Description                     |
| --------- | ----------------- | ------------------------------- |
| `payload` | `OpenDiffPayload` | Configuration for the diff view |

### `OpenDiffPayload`

| Property          | Type      | Required | Description                                                                                   |
| ----------------- | --------- | -------- | --------------------------------------------------------------------------------------------- |
| `filePath`        | `string`  | No\*     | Path to the original file on disk (used to read content if `originalContent` is not provided) |
| `originalContent` | `string`  | No\*     | Original content as a string (takes precedence over `filePath` for content)                   |
| `modifiedContent` | `string`  | Yes      | The proposed modified content                                                                 |
| `title`           | `string`  | No       | Title for the diff editor tab (defaults to the `filePath` basename)                           |
| `autoApply`       | `boolean` | No       | Whether to auto-write accepted changes to disk (default: `true`)                              |

\* At least one of `filePath` or `originalContent` must be provided. If neither is present, `openDiff` throws an error synchronously.

When both `filePath` and `originalContent` are provided, `originalContent` takes precedence — the file is not read from disk.

### Return value

`Promise<OpenDiffResult>`

The Promise remains pending while the diff editor is open. It resolves only when the user explicitly clicks Accept or Reject. There is no "dismissed" state.

---

## `OpenDiffResult`

| Property   | Type                     | Description                                                                           |
| ---------- | ------------------------ | ------------------------------------------------------------------------------------- |
| `accepted` | `boolean`                | `true` if the user accepted (whole or partial), `false` if rejected                   |
| `hunks`    | `HunkDecision[] \| null` | `null` for whole-file accept/reject, array of decisions for partial (per-hunk) accept |
| `content`  | `string \| undefined`    | Present when `autoApply` is `true` but no `filePath` is available                     |

---

## `HunkDecision`

When the user performs per-hunk acceptance, the `hunks` array contains one entry for every hunk in the diff.

| Property   | Type      | Description                              |
| ---------- | --------- | ---------------------------------------- |
| `index`    | `number`  | Zero-based index of the hunk in the diff |
| `accepted` | `boolean` | Whether this specific hunk was accepted  |

---

## Long-lived request pattern

Unlike most bridge actions that resolve immediately, `openDiff` follows a long-lived request pattern:

1. The webview sends an `open-diff` request with a correlation ID
2. The IDE opens the native diff editor
3. The Promise stays pending while the user reviews the diff
4. When the user clicks Accept or Reject, the IDE sends a reply with the same correlation ID
5. The Promise resolves with the `OpenDiffResult`

This means your application flow pauses at the `await openDiff(...)` call until the user makes a decision. Plan your UI accordingly — consider showing a "waiting for review" state.

---

## Usage examples

### File path mode

Use `filePath` when diffing against an existing file on disk. The IDE reads the original content from the file automatically.

```ts
import { openDiff } from '@unextension/bridge'

const result = await openDiff({
  filePath: 'src/utils.ts',
  modifiedContent: 'export function greet(name: string) {\n  return `Hello, ${name}!`\n}\n',
  title: 'Update greet function',
})

if (result.accepted) {
  console.log('Changes accepted and written to disk')
} else {
  console.log('Changes rejected')
}
```

With `autoApply: true` (the default), accepted changes are automatically written to the file at `filePath`.

### Original content mode

Use `originalContent` when working with in-memory content that doesn't correspond to a file on disk, or when you want to control the original content explicitly.

```ts
import { openDiff } from '@unextension/bridge'

const original = 'const x = 1;\nconst y = 2;\n'
const modified = 'const x = 1;\nconst y = 3;\nconst z = 4;\n'

const result = await openDiff({
  originalContent: original,
  modifiedContent: modified,
  title: 'Review variable changes',
  autoApply: false,
})

if (result.accepted) {
  // Handle the accepted changes in your application
  console.log('User approved the changes')
}
```

### Per-hunk handling

When the diff contains multiple hunks, the user can accept or reject each one individually. The result includes a `hunks` array with a decision for every hunk.

```ts
import { openDiff } from '@unextension/bridge'

const result = await openDiff({
  originalContent: originalCode,
  modifiedContent: modifiedCode,
  autoApply: false,
})

if (result.accepted && result.hunks) {
  // Partial acceptance — user reviewed individual hunks
  for (const hunk of result.hunks) {
    if (hunk.accepted) {
      console.log(`Hunk ${hunk.index} accepted`)
    } else {
      console.log(`Hunk ${hunk.index} rejected`)
    }
  }
} else if (result.accepted) {
  // Whole-file acceptance (hunks is null)
  console.log('All changes accepted')
} else {
  // Whole-file rejection
  console.log('All changes rejected')
}
```

### Auto-apply with content fallback

When `autoApply` is `true` (the default) and a `filePath` is provided, accepted changes are written to disk automatically. However, if no `filePath` is available, the IDE cannot write to disk — instead, the accepted content is returned in the `content` property of the result.

```ts
import { openDiff } from '@unextension/bridge'

// No filePath — content is returned instead of written to disk
const result = await openDiff({
  originalContent: 'old content',
  modifiedContent: 'new content',
  autoApply: true, // default
})

if (result.accepted && result.content) {
  // The IDE couldn't write to disk, so it returned the content
  console.log('Accepted content:', result.content)
  // You can write it yourself or use it in your application
}
```

---

## Error handling

`openDiff` throws synchronously if the payload is invalid. For IDE-side errors, the Promise resolves with `{ accepted: false, hunks: null }`.

| Scenario                                          | Result                                           |
| ------------------------------------------------- | ------------------------------------------------ |
| Neither `filePath` nor `originalContent` provided | Throws `Error` synchronously                     |
| `filePath` points to non-existent file            | Resolves with `{ accepted: false, hunks: null }` |
| User clicks Accept (whole file)                   | Resolves with `{ accepted: true, hunks: null }`  |
| User clicks Reject                                | Resolves with `{ accepted: false, hunks: null }` |
| User performs partial accept                      | Resolves with `{ accepted: true, hunks: [...] }` |
| IDE does not support diff                         | Resolves with `{ accepted: false, hunks: null }` |

```ts
try {
  const result = await openDiff({
    modifiedContent: 'new content',
    // Missing both filePath and originalContent!
  })
} catch (err) {
  console.error(err.message)
  // 'openDiff requires either filePath or originalContent'
}
```

---

## Types

All types are exported from `@unextension/bridge`:

```ts
import type { OpenDiffPayload, OpenDiffResult, HunkDecision } from '@unextension/bridge'
```

### `OpenDiffPayload`

```ts
interface OpenDiffPayload {
  filePath?: string
  originalContent?: string
  modifiedContent: string
  title?: string
  autoApply?: boolean
}
```

### `OpenDiffResult`

```ts
interface OpenDiffResult {
  accepted: boolean
  hunks: HunkDecision[] | null
  content?: string
}
```

### `HunkDecision`

```ts
interface HunkDecision {
  index: number
  accepted: boolean
}
```
