---
title: Execute Command
description: Execute IDE commands by their command ID from your web app using @unextension/bridge.
---

The `executeCommand` action lets your web app execute any IDE command by its command ID. This provides access to the full range of built-in commands (1000+ in VS Code) without patching the generated extension code.

```ts
import { executeCommand } from '@unextension/bridge'
```

---

## `executeCommand(command, args?)`

Executes an IDE command and returns the result.

```ts
const result = await executeCommand('workbench.action.openSettings')
console.log(result.result) // null (command returns void)
```

### Parameters

| Parameter | Type        | Required | Description                               |
| --------- | ----------- | -------- | ----------------------------------------- |
| `command` | `string`    | ✅       | The IDE command ID to execute             |
| `args`    | `unknown[]` | —        | Optional arguments to pass to the command |

### Return value

`Promise<ExecuteCommandResult>`

| Field    | Type      | Description                                                    |
| -------- | --------- | -------------------------------------------------------------- |
| `result` | `unknown` | The return value from the command (`undefined` if void)        |
| `error`  | `string`  | Error message if the command failed, was blocked, or timed out |

Only one of `result` or `error` will be present in the response.

---

## Usage examples

### Open IDE settings

```ts
const result = await executeCommand('unextension.openSettings')

if (result.error) {
  console.error('Failed to open settings:', result.error)
} else {
  console.log('Settings opened')
}
```

### Toggle the panel

```ts
const result = await executeCommand('unextension.togglePanel')

if (result.error) {
  console.error('Failed to toggle panel:', result.error)
}
```

### Execute a command with arguments

```ts
const result = await executeCommand('unextension.openInBrowser', ['https://example.com'])
console.log(result.result)
```

---

## Cross-platform commands

Unextension provides a set of `unextension.*` commands that work identically across VS Code and JetBrains. These abstract away platform-specific command IDs so your web app doesn't need to know which IDE it's running in.

### General

| Unextension Command          | VS Code Equivalent                         | JetBrains Action             |
| ---------------------------- | ------------------------------------------ | ---------------------------- |
| `unextension.openSettings`   | `workbench.action.openSettings`            | `ShowSettings`               |
| `unextension.openInBrowser`  | `simpleBrowser.api.open`                   | `BrowserUtil.browse`         |
| `unextension.togglePanel`    | `workbench.action.togglePanel`             | `ActivateTerminalToolWindow` |
| `unextension.toggleSidebar`  | `workbench.action.toggleSidebarVisibility` | `ActivateProjectToolWindow`  |
| `unextension.newScratchFile` | `workbench.action.files.newUntitledFile`   | `NewScratchFile`             |

### Editor Actions

| Unextension Command          | VS Code Equivalent             | JetBrains Action       |
| ---------------------------- | ------------------------------ | ---------------------- |
| `unextension.formatDocument` | `editor.action.formatDocument` | `ReformatCode`         |
| `unextension.commentLine`    | `editor.action.commentLine`    | `CommentByLineComment` |
| `unextension.undo`           | `undo`                         | `$Undo`                |
| `unextension.redo`           | `redo`                         | `$Redo`                |
| `unextension.selectAll`      | `editor.action.selectAll`      | `$SelectAll`           |

### Navigation

| Unextension Command          | VS Code Equivalent                | JetBrains Action  |
| ---------------------------- | --------------------------------- | ----------------- |
| `unextension.goToDefinition` | `editor.action.revealDefinition`  | `GotoDeclaration` |
| `unextension.goToFile`       | `workbench.action.quickOpen`      | `GotoFile`        |
| `unextension.goToSymbol`     | `workbench.action.gotoSymbol`     | `GotoSymbol`      |
| `unextension.findInFiles`    | `workbench.action.findInFiles`    | `FindInPath`      |
| `unextension.replaceInFiles` | `workbench.action.replaceInFiles` | `ReplaceInPath`   |

### Refactoring

| Unextension Command    | VS Code Equivalent       | JetBrains Action       |
| ---------------------- | ------------------------ | ---------------------- |
| `unextension.rename`   | `editor.action.rename`   | `RenameElement`        |
| `unextension.quickFix` | `editor.action.quickFix` | `ShowIntentionActions` |

### View/UI

| Unextension Command             | VS Code Equivalent                   | JetBrains Action         |
| ------------------------------- | ------------------------------------ | ------------------------ |
| `unextension.toggleFullscreen`  | `workbench.action.toggleFullScreen`  | `ToggleFullScreen`       |
| `unextension.zoomIn`            | `workbench.action.zoomIn`            | `EditorIncreaseFontSize` |
| `unextension.zoomOut`           | `workbench.action.zoomOut`           | `EditorDecreaseFontSize` |
| `unextension.closeActiveEditor` | `workbench.action.closeActiveEditor` | `CloseContent`           |
| `unextension.closeAllEditors`   | `workbench.action.closeAllEditors`   | `CloseAllEditors`        |

### VCS/Git

| Unextension Command     | VS Code Equivalent | JetBrains Action    |
| ----------------------- | ------------------ | ------------------- |
| `unextension.gitCommit` | `git.commit`       | `CheckinProject`    |
| `unextension.gitPull`   | `git.pull`         | `Vcs.UpdateProject` |
| `unextension.gitPush`   | `git.push`         | `Vcs.Push`          |

### Terminal

| Unextension Command       | VS Code Equivalent              | JetBrains Action          |
| ------------------------- | ------------------------------- | ------------------------- |
| `unextension.newTerminal` | `workbench.action.terminal.new` | `Terminal.OpenInTerminal` |

Use these commands when you want cross-platform behavior without conditional logic:

```ts
import { executeCommand } from '@unextension/bridge'

// Works in both VS Code and JetBrains
await executeCommand('unextension.openSettings')
await executeCommand('unextension.togglePanel')
await executeCommand('unextension.openInBrowser', ['https://example.com'])
await executeCommand('unextension.formatDocument')
await executeCommand('unextension.findInFiles')
```

:::note
JetBrains only supports `unextension.*` commands. Any other command ID (e.g. `workbench.action.openSettings`) will return a guidance error. Use the cross-platform commands above or the `getTarget()` pattern below for platform-specific commands.
:::

---

## Platform-specific commands

If you need to execute a command that isn't available as an `unextension.*` abstraction, use `getTarget()` to detect the platform and call native commands conditionally:

```ts
import { executeCommand, getTarget } from '@unextension/bridge'

const { target } = await getTarget()

if (target === 'vscode') {
  await executeCommand('editor.action.formatDocument')
} else {
  // JetBrains only supports unextension.* commands
  // Use platform-specific logic here
}
```

This pattern is useful for VS Code-only commands that don't have a JetBrains equivalent in the `unextension.*` set.

---

## Allowlist configuration

By default, all commands are allowed. You can restrict which commands can be executed by configuring `commands.allow` in your `unextension.config.ts`:

```ts
import { defineConfig } from '@unextension/cli'

export default defineConfig({
  name: 'my-extension',
  commands: {
    allow: ['simpleBrowser.api.open', 'workbench.action.*'],
  },
})
```

The allowlist supports:

- **Exact matches** — e.g. `simpleBrowser.api.open` matches only that command
- **Glob patterns** — `*` matches one or more characters within a single dot-separated segment (e.g. `workbench.action.*` matches `workbench.action.openSettings` but not `workbench.action.editor.openSettings`)

When `commands.allow` is set to an empty array (`[]`), all commands are blocked.

---

## Error handling

`executeCommand` resolves with an `ExecuteCommandResult` containing an `error` field when the command fails. It only rejects the promise when the command ID is empty (client-side validation).

| Scenario                             | Result                                                                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Command executes successfully        | `{ result: <return value> }`                                                                                                                 |
| Command not found in IDE             | `{ error: "<message>" }`                                                                                                                     |
| Command blocked by allowlist         | `{ error: "Command not allowed: <command_id>" }`                                                                                             |
| Command throws during execution      | `{ error: "<original error message>" }`                                                                                                      |
| Command times out (>10 seconds)      | `{ error: "Command timed out: <command_id>" }`                                                                                               |
| Non-unextension command in JetBrains | `{ error: "Command not supported in JetBrains: <command>. Use getTarget() to detect the platform and call native commands conditionally." }` |
| Empty command string                 | Promise rejects with `Error`                                                                                                                 |

```ts
try {
  const result = await executeCommand('some.command')

  if (result.error) {
    // Command failed on the IDE side
    console.error('Command error:', result.error)
  } else {
    console.log('Command result:', result.result)
  }
} catch (err) {
  // Only happens for empty command string
  console.error('Invalid command:', err.message)
}
```

---

## Types

All types are exported from `@unextension/bridge`:

```ts
import type { ExecuteCommandResult } from '@unextension/bridge'
```

### `ExecuteCommandResult`

```ts
interface ExecuteCommandResult {
  /** The return value from the IDE command (undefined if command returned void) */
  result?: unknown
  /** Error message if the command failed, was not found, or was blocked */
  error?: string
}
```
