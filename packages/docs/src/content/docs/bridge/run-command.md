---
title: runCommand
description: Run shell commands on the IDE host machine using @unextension/bridge.
---

Runs a shell command on the IDE host machine and returns its output.

```ts
import { runCommand } from '@unextension/bridge'
```

---

## `runCommand(command, options?)`

```ts
const result = await runCommand('git status')
console.log(result.stdout) // 'On branch main...'
console.log(result.exitCode) // 0

// Use a specific shell
const result2 = await runCommand('Get-Date', { shell: 'powershell' })
```

### Parameters

| Parameter | Type                | Description                  |
| --------- | ------------------- | ---------------------------- |
| `command` | `string`            | The shell command to execute |
| `options` | `RunCommandOptions` | Optional shell configuration |

### `RunCommandOptions`

| Option  | Type    | Default                            | Description  |
| ------- | ------- | ---------------------------------- | ------------ |
| `shell` | `Shell` | `'cmd'` on Windows, `'sh'` on Unix | Shell to use |

### `Shell` values

`'cmd'` · `'powershell'` · `'bash'` · `'sh'` · `'zsh'` · `'fish'`

### Return value

`Promise<RunCommandResult>`

| Field      | Type     | Description       |
| ---------- | -------- | ----------------- |
| `stdout`   | `string` | Standard output   |
| `stderr`   | `string` | Standard error    |
| `exitCode` | `number` | Process exit code |
