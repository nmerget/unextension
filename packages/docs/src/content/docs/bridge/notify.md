---
title: notify
description: Show native IDE notifications from your web app using @unextension/bridge.
---

Shows a native IDE notification (info, warning, or error).

```ts
import { notify } from '@unextension/bridge'
```

---

## `notify(message, level?)`

```ts
await notify('Build complete!')
await notify('File not found', 'warning')
await notify('Compilation failed', 'error')
```

### Parameters

| Parameter | Type          | Default  | Description           |
| --------- | ------------- | -------- | --------------------- |
| `message` | `string`      | —        | The notification text |
| `level`   | `NotifyLevel` | `'info'` | Severity level        |

### `NotifyLevel` values

`'info'` · `'warning'` · `'error'`

### Return value

`Promise<void>`
