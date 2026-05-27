---
title: writeProjectFile
description: Write file contents to the project using @unextension/bridge.
---

Writes content to a file relative to the project root. Creates the file and any missing parent directories if they don't exist.

```ts
import { writeProjectFile } from '@unextension/bridge'
```

---

## `writeProjectFile(path, content)`

```ts
await writeProjectFile('src/generated/routes.ts', generatedCode)
await writeProjectFile('notes.txt', 'Hello from the extension!')
```

### Parameters

| Parameter | Type     | Description                            |
| --------- | -------- | -------------------------------------- |
| `path`    | `string` | File path relative to the project root |
| `content` | `string` | UTF-8 string content to write          |

### Return value

`Promise<WriteProjectFileResult>`

| Field     | Type      | Description                 |
| --------- | --------- | --------------------------- |
| `success` | `boolean` | Whether the write succeeded |
