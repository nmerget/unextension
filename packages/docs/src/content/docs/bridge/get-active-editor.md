---
title: Get Active Editor
description: Retrieve information about the currently active editor in the IDE host using @unextension/bridge.
---

The `getActiveEditor` action retrieves information about the currently active editor in the host IDE, including file paths, language, cursor/selection position, and optionally the full file content.

```ts
import { getActiveEditor } from '@unextension/bridge'
```

---

## `getActiveEditor(options?)`

Returns information about the currently active editor, or `null` if no editor is open.

```ts
const editor = await getActiveEditor()
if (editor) {
  console.log(editor.relativePath) // 'src/index.ts'
  console.log(editor.language) // 'typescript'
  console.log(editor.startLine, editor.startColumn) // cursor position
}
```

### Parameters

| Parameter | Type                     | Description            |
| --------- | ------------------------ | ---------------------- |
| `options` | `GetActiveEditorOptions` | Optional configuration |

### `GetActiveEditorOptions`

| Option           | Type      | Default | Description                                            |
| ---------------- | --------- | ------- | ------------------------------------------------------ |
| `includeContent` | `boolean` | `false` | When `true`, includes the full file text in the result |

### Return value

`Promise<GetActiveEditorResult | null>`

Returns `null` when no editor is currently open in the IDE.

---

## `GetActiveEditorResult`

| Field          | Type     | Required | Description                                                    |
| -------------- | -------- | -------- | -------------------------------------------------------------- |
| `relativePath` | `string` | Yes      | File path relative to the project root                         |
| `absolutePath` | `string` | Yes      | Full filesystem path of the active file                        |
| `language`     | `string` | Yes      | Language identifier as reported by the IDE (e.g. `typescript`) |
| `startLine`    | `number` | Yes      | Start line of cursor or selection (0-indexed)                  |
| `startColumn`  | `number` | Yes      | Start column of cursor or selection (0-indexed)                |
| `endLine`      | `number` | Yes      | End line of cursor or selection (0-indexed)                    |
| `endColumn`    | `number` | Yes      | End column of cursor or selection (0-indexed)                  |
| `selection`    | `string` | No       | Selected text (only present when text is selected)             |
| `content`      | `string` | No       | Full file content (only present when `includeContent` is true) |

---

## Usage examples

### Basic call

```ts
const editor = await getActiveEditor()

if (editor) {
  console.log(`File: ${editor.relativePath}`)
  console.log(`Language: ${editor.language}`)
  console.log(`Cursor: line ${editor.startLine}, column ${editor.startColumn}`)
} else {
  console.log('No editor is open')
}
```

### With file content

```ts
const editor = await getActiveEditor({ includeContent: true })

if (editor) {
  console.log(`File: ${editor.relativePath}`)
  console.log(`Content length: ${editor.content?.length} chars`)
}
```

### Reading a selection

When the user has text selected, `startLine`/`startColumn` and `endLine`/`endColumn` define the selection range, and the `selection` field contains the selected text:

```ts
const editor = await getActiveEditor()

if (editor?.selection) {
  console.log(`Selected: "${editor.selection}"`)
  console.log(
    `From ${editor.startLine}:${editor.startColumn} to ${editor.endLine}:${editor.endColumn}`,
  )
}
```

When no text is selected, `startLine === endLine` and `startColumn === endColumn`, representing the cursor position. The `selection` field is not present.

---

## Null return

`getActiveEditor` returns `null` when no editor is currently open in the IDE. Always check for `null` before accessing result fields:

```ts
const editor = await getActiveEditor()

if (!editor) {
  // No editor is open — handle the empty state
  return
}

// Safe to use editor fields here
console.log(editor.relativePath)
```

---

## Types

All types are exported from `@unextension/bridge`:

```ts
import type { GetActiveEditorOptions, GetActiveEditorResult } from '@unextension/bridge'
```

### `GetActiveEditorOptions`

```ts
interface GetActiveEditorOptions {
  includeContent?: boolean
}
```

### `GetActiveEditorResult`

```ts
interface GetActiveEditorResult {
  relativePath: string
  absolutePath: string
  language: string
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
  selection?: string
  content?: string
}
```
