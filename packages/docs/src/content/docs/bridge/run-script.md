---
title: runScript
description: Run Node.js scripts on the IDE host machine using @unextension/bridge.
---

Runs a Node.js script from the extension's `scripts/` folder on the IDE host machine. The script has full access to the host filesystem and any installed Node.js modules.

```ts
import { runScript } from '@unextension/bridge'
```

---

## `runScript(name, payload?)`

```ts
const result = await runScript('hello', { from: 'my-view' })
console.log(result.result) // whatever the script returned as JSON
console.log(result.exitCode) // 0
```

### Parameters

| Parameter | Type      | Description                             |
| --------- | --------- | --------------------------------------- |
| `name`    | `string`  | Script filename without `.js` extension |
| `payload` | `unknown` | Optional data passed to the script      |

### Return value

`Promise<RunScriptResult>`

| Field      | Type      | Description                                 |
| ---------- | --------- | ------------------------------------------- |
| `result`   | `unknown` | Parsed JSON output from the script's stdout |
| `exitCode` | `number`  | Process exit code                           |
| `stderr`   | `string`  | Standard error output                       |

See [Scripts](./scripts) for how to create and bundle scripts.
