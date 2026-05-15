---
title: Get Diagnostics
description: Retrieve compile, lint, type, and other semantic diagnostics from the IDE host using @unextension/bridge.
---

The `getDiagnostics` action retrieves diagnostics (errors, warnings, info, hints) from the host IDE. You can optionally filter by file path or limit results to currently open files.

```ts
import { getDiagnostics } from '@unextension/bridge'
```

---

## `getDiagnostics(options?)`

Returns diagnostics from the IDE workspace.

```ts
const result = await getDiagnostics()
console.log(result.diagnostics.length) // number of diagnostics
```

### Parameters

| Parameter | Type                    | Description            |
| --------- | ----------------------- | ---------------------- |
| `options` | `GetDiagnosticsOptions` | Optional configuration |

### `GetDiagnosticsOptions`

| Option          | Type      | Default     | Description                                                      |
| --------------- | --------- | ----------- | ---------------------------------------------------------------- |
| `path`          | `string`  | `undefined` | Filter diagnostics to a specific file (relative to project root) |
| `openFilesOnly` | `boolean` | `false`     | When `true`, returns diagnostics only for currently open files   |

### Return value

`Promise<GetDiagnosticsResult>`

Returns an object containing a `diagnostics` array. The array is empty when no diagnostics match the requested scope.

---

## `GetDiagnosticsResult`

| Field         | Type           | Description                 |
| ------------- | -------------- | --------------------------- |
| `diagnostics` | `Diagnostic[]` | Array of diagnostic entries |

---

## `Diagnostic`

Each diagnostic entry describes a single issue reported by the IDE.

| Field       | Type       | Required | Description                                                                     |
| ----------- | ---------- | -------- | ------------------------------------------------------------------------------- |
| `file`      | `string`   | Yes      | File path relative to the project root                                          |
| `line`      | `number`   | Yes      | Start line of the diagnostic (1-based)                                          |
| `column`    | `number`   | Yes      | Start column of the diagnostic (1-based)                                        |
| `endLine`   | `number`   | No       | End line of the diagnostic range (1-based, present when range spans a region)   |
| `endColumn` | `number`   | No       | End column of the diagnostic range (1-based, present when range spans a region) |
| `message`   | `string`   | Yes      | The diagnostic message text                                                     |
| `severity`  | `Severity` | Yes      | One of `'error'`, `'warning'`, `'info'`, or `'hint'`                            |
| `source`    | `string`   | No       | The tool that produced the diagnostic (e.g. `'typescript'`, `'eslint'`)         |

---

## Usage examples

### Get all diagnostics

```ts
const result = await getDiagnostics()

for (const diag of result.diagnostics) {
  console.log(`[${diag.severity}] ${diag.file}:${diag.line}:${diag.column} — ${diag.message}`)
}
```

### Filter by file path

```ts
const result = await getDiagnostics({ path: 'src/index.ts' })

console.log(`${result.diagnostics.length} issue(s) in src/index.ts`)
```

### Only open files

```ts
const result = await getDiagnostics({ openFilesOnly: true })

console.log(`${result.diagnostics.length} issue(s) in open files`)
```

### Handling the empty state

When no diagnostics exist for the requested scope, the `diagnostics` array is empty — no null checks needed:

```ts
const result = await getDiagnostics({ path: 'src/clean-file.ts' })

if (result.diagnostics.length === 0) {
  console.log('No issues found')
}
```

---

## Types

All types are exported from `@unextension/bridge`:

```ts
import type {
  Diagnostic,
  GetDiagnosticsOptions,
  GetDiagnosticsResult,
  Severity,
} from '@unextension/bridge'
```

### `Severity`

```ts
type Severity = 'error' | 'warning' | 'info' | 'hint'
```

### `Diagnostic`

```ts
interface Diagnostic {
  file: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  message: string
  severity: Severity
  source?: string
}
```

### `GetDiagnosticsOptions`

```ts
interface GetDiagnosticsOptions {
  path?: string
  openFilesOnly?: boolean
}
```

### `GetDiagnosticsResult`

```ts
interface GetDiagnosticsResult {
  diagnostics: Diagnostic[]
}
```
