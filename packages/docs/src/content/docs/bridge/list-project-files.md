---
title: listProjectFiles
description: List files in the current project from your web app using @unextension/bridge.
---

Returns a list of file paths in the current project, relative to the project root.

```ts
import { listProjectFiles } from '@unextension/bridge'
```

---

## `listProjectFiles(options?)`

```ts
const files = await listProjectFiles()
// ['src/index.ts', 'src/main.css', 'package.json', ...]

const tsFiles = await listProjectFiles({ pattern: '**/*.ts' })
// ['src/index.ts', 'src/routes/panel.tsx', ...]
```

### Options

| Option    | Type     | Default  | Description                  |
| --------- | -------- | -------- | ---------------------------- |
| `pattern` | `string` | `'**/*'` | Glob pattern to filter files |

The following directories are always excluded: `node_modules`, `.git`, `.idea`, `.gradle`, `build`, `out`, `dist`.

### Return value

`Promise<string[]>` — array of relative file paths.
