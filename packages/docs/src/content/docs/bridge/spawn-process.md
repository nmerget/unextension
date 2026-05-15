---
title: spawnProcess
description: Spawn a long-lived subprocess and communicate with it bidirectionally over stdin/stdout using @unextension/bridge.
---

The `spawnProcess` action spawns a long-lived subprocess on the host IDE and returns a `ProcessHandle` for bidirectional communication over stdin/stdout. This enables web apps to interact with CLI tools (such as ACP-compatible agents) that communicate over stdio streams.

```ts
import { spawnProcess } from '@unextension/bridge'
```

---

## `spawnProcess(command, args?, options?)`

Spawns a subprocess and returns a handle for interacting with it.

```ts
const proc = await spawnProcess('node', ['agent.js', '--stdio'])
console.log(proc.pid) // OS process ID
```

### Parameters

| Parameter | Type                  | Description                                      |
| --------- | --------------------- | ------------------------------------------------ |
| `command` | `string`              | The command to execute                           |
| `args`    | `string[]`            | Arguments to pass to the command (default: `[]`) |
| `options` | `SpawnProcessOptions` | Optional spawn configuration                     |

### `SpawnProcessOptions`

| Option | Type                     | Description                                                |
| ------ | ------------------------ | ---------------------------------------------------------- |
| `cwd`  | `string`                 | Working directory for the subprocess                       |
| `env`  | `Record<string, string>` | Environment variables to merge with the system environment |

### Return value

`Promise<ProcessHandle>`

The returned `ProcessHandle` provides methods and properties for interacting with the spawned subprocess.

---

## `ProcessHandle`

| Property/Method | Type                        | Description                                      |
| --------------- | --------------------------- | ------------------------------------------------ |
| `processId`     | `string`                    | Unique identifier for this process               |
| `pid`           | `number`                    | Operating system process ID                      |
| `stdout`        | `ReadableStream<string>`    | Stream of stdout output chunks                   |
| `stderr`        | `ReadableStream<string>`    | Stream of stderr output chunks                   |
| `exitCode`      | `Promise<number>`           | Resolves with the exit code when process exits   |
| `send(data)`    | `(data: string) => void`    | Write data to the subprocess stdin               |
| `kill(signal?)` | `(signal?: string) => void` | Terminate the subprocess with an optional signal |

---

## Usage examples

### Basic spawn and read output

```ts
import { spawnProcess } from '@unextension/bridge'

const proc = await spawnProcess('echo', ['hello world'])

const reader = proc.stdout.getReader()
const { value } = await reader.read()
console.log(value) // 'hello world\n'

const code = await proc.exitCode
console.log('Exited with:', code) // 0
```

### Sending input to a process

```ts
import { spawnProcess } from '@unextension/bridge'

const proc = await spawnProcess('cat')

proc.send('first line\n')
proc.send('second line\n')

const reader = proc.stdout.getReader()
const chunk1 = await reader.read()
console.log(chunk1.value) // 'first line\n'

proc.kill()
```

### Handling process exit

```ts
import { spawnProcess } from '@unextension/bridge'

const proc = await spawnProcess('node', ['long-running-script.js'], {
  cwd: '/path/to/project',
  env: { NODE_ENV: 'production' },
})

// Wait for the process to finish
const code = await proc.exitCode

if (code === 0) {
  console.log('Process completed successfully')
} else {
  console.log('Process failed with code:', code)
}
```

### Reading stderr

```ts
import { spawnProcess } from '@unextension/bridge'

const proc = await spawnProcess('node', ['-e', 'console.error("warning")'])

const reader = proc.stderr.getReader()
const { value } = await reader.read()
console.log('stderr:', value) // 'warning\n'
```

---

## Error handling

`spawnProcess` rejects the returned promise if the command cannot be found or the process fails to start.

| Scenario                    | Result                                           |
| --------------------------- | ------------------------------------------------ |
| Command spawns successfully | Resolves with `ProcessHandle`                    |
| Command not found           | Promise rejects with descriptive error           |
| Process exits normally      | `exitCode` resolves with exit code               |
| Process crashes             | `exitCode` resolves with code `1`, streams close |
| Kill called                 | Process terminates, exit event delivered         |

```ts
try {
  const proc = await spawnProcess('nonexistent-binary')
} catch (err) {
  console.error('Failed to spawn:', err.message)
}
```

---

## Types

All types are exported from `@unextension/bridge`:

```ts
import type { SpawnProcessOptions, ProcessHandle } from '@unextension/bridge'
```

### `SpawnProcessOptions`

```ts
interface SpawnProcessOptions {
  cwd?: string
  env?: Record<string, string>
}
```

### `ProcessHandle`

```ts
interface ProcessHandle {
  readonly processId: string
  readonly pid: number
  readonly stdout: ReadableStream<string>
  readonly stderr: ReadableStream<string>
  readonly exitCode: Promise<number>
  send(data: string): void
  kill(signal?: string): void
}
```
