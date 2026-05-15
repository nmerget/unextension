---
title: Open File
description: Open a file in the IDE editor with optional cursor positioning or range selection using @unextension/bridge.
---

The `openFile` action opens a project file in the host IDE's editor. It supports optional cursor positioning and range selection, enabling precise navigation to specific locations within a file.

```ts
import { openFile } from '@unextension/bridge'
```

---

## `openFile(path, options?)`

Opens a file in the IDE editor, optionally positioning the cursor or selecting a range of text.

```ts
const result = await openFile('src/index.ts')
console.log(result.success) // true
```

### Parameters

| Parameter | Type              | Description                                    |
| --------- | ----------------- | ---------------------------------------------- |
| `path`    | `string`          | File path relative to the project root         |
| `options` | `OpenFileOptions` | Optional cursor positioning or range selection |

### `OpenFileOptions`

| Option        | Type     | Description                                 |
| ------------- | -------- | ------------------------------------------- |
| `line`        | `number` | Line number to place the cursor (1-based)   |
| `column`      | `number` | Column number to place the cursor (1-based) |
| `startLine`   | `number` | Start line of a text selection (1-based)    |
| `startColumn` | `number` | Start column of a text selection (1-based)  |
| `endLine`     | `number` | End line of a text selection (1-based)      |
| `endColumn`   | `number` | End column of a text selection (1-based)    |

All fields are optional. When no options are provided, the file opens with the cursor at the default position (line 1, column 1).

When `startLine`, `startColumn`, `endLine`, and `endColumn` are all provided, the IDE selects the specified range instead of positioning the cursor.

### Return value

`Promise<OpenFileResult>`

| Field     | Type      | Description                              |
| --------- | --------- | ---------------------------------------- |
| `success` | `boolean` | Whether the file was opened successfully |

---

## Usage examples

### Open a file

```ts
const result = await openFile('src/index.ts')

if (result.success) {
  console.log('File opened')
} else {
  console.log('File not found')
}
```

### Cursor positioning

Position the cursor at a specific line and column after opening:

```ts
const result = await openFile('src/utils.ts', {
  line: 42,
  column: 10,
})
```

### Range selection

Select a range of text after opening the file:

```ts
const result = await openFile('src/app.ts', {
  startLine: 5,
  startColumn: 1,
  endLine: 5,
  endColumn: 20,
})
```

---

## Error handling

`openFile` resolves with `{ success: false }` when the file cannot be opened. It does not reject the promise or create the file.

| Scenario                  | Result               |
| ------------------------- | -------------------- |
| File exists and opens     | `{ success: true }`  |
| File does not exist       | `{ success: false }` |
| No workspace/project open | `{ success: false }` |

```ts
const { success } = await openFile('path/to/file.ts')

if (!success) {
  console.warn('Could not open file')
}
```

---

## Types

All types are exported from `@unextension/bridge`:

```ts
import type { OpenFileOptions, OpenFileResult } from '@unextension/bridge'
```

### `OpenFileOptions`

```ts
interface OpenFileOptions {
  line?: number
  column?: number
  startLine?: number
  startColumn?: number
  endLine?: number
  endColumn?: number
}
```

### `OpenFileResult`

```ts
interface OpenFileResult {
  success: boolean
}
```
