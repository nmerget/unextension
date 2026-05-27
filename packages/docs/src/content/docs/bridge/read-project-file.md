---
title: readProjectFile
description: Read file contents from the project using @unextension/bridge.
---

Reads the content of a file relative to the project root.

```ts
import { readProjectFile } from '@unextension/bridge'
```

---

## `readProjectFile(path)`

```ts
const result = await readProjectFile('package.json')
const pkg = JSON.parse(result.content)
console.log(pkg.name)
```

### Parameters

| Parameter | Type     | Description                            |
| --------- | -------- | -------------------------------------- |
| `path`    | `string` | File path relative to the project root |

### Return value

`Promise<ReadProjectFileResult>`

| Field      | Type     | Description                    |
| ---------- | -------- | ------------------------------ |
| `content`  | `string` | File content as a UTF-8 string |
| `encoding` | `'utf8'` | Always `'utf8'`                |
