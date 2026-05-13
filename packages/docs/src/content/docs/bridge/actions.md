---
title: Actions
description: Built-in bridge actions for interacting with the IDE host from your web app.
---

Actions are typed async functions that send a request to the IDE host and return a `Promise` with the result. They use `bridge.request()` internally and work identically in VS Code and JetBrains.

```ts
import {
  listProjectFiles,
  runCommand,
  notify,
  readProjectFile,
  writeProjectFile,
  runScript,
} from '@unextension/bridge'
```

---

## `listProjectFiles(options?)`

Returns a list of file paths in the current project, relative to the project root.

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

---

## `runCommand(command, options?)`

Runs a shell command on the IDE host machine and returns its output.

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

---

## `notify(message, level?)`

Shows a native IDE notification.

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

---

## `readProjectFile(path)`

Reads the content of a file relative to the project root.

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

---

## `writeProjectFile(path, content)`

Writes content to a file relative to the project root. Creates the file and any missing parent directories if they don't exist.

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

---

## `runScript(name, payload?)`

Runs a Node.js script from the extension's `scripts/` folder on the IDE host machine. The script has full access to the host filesystem and any installed Node.js modules.

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

---

## Adding custom actions

See the [AGENTS.md](https://github.com/nmerget/unextension/blob/main/AGENTS.md) checklist for the full steps to add a new action across the bridge, VS Code target, JetBrains target, and KitchenSink test component.
