---
title: Config File
description: Configure unextension with a config file.
---

unextension uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) to load your config. It supports `unextension.config.ts`, `.js`, `.mjs`, `.json`, `.yaml`, or a `unextension` key in `package.json`.

## Example

```ts
import { defineConfig } from '@unextension/cli'

export default defineConfig({
  name: 'my-extension',
  displayName: 'My Extension',
  version: '0.1.0',
  description: 'A universal IDE extension',
  distDir: './dist',
  targets: ['vscode', 'jetbrains'],
  jetbrains: {
    downloadGradleWrapper: true,
  },
})
```

## Options

### `name` (required)

The extension identifier in kebab-case. Used as the extension ID in both VS Code and JetBrains.

### `displayName` (required)

The human-readable name shown in the IDE marketplace.

### `version` (required)

Semver version string, e.g. `0.1.0`.

### `description`

A short description of your extension.

### `distDir`

Path to your built web app output. Defaults to `./dist`.

### `targets`

Array of target platforms to generate. Defaults to `['vscode', 'jetbrains']`.

### `jetbrains.downloadGradleWrapper`

Whether to automatically download the `gradle-wrapper.jar` during `sync`. Defaults to `true`.

### `commands.allow`

Restricts which command IDs can be executed via the `executeCommand` bridge action. The value is an array of glob-pattern strings where `*` matches one or more characters within a single dot-separated segment.

When omitted, all commands are allowed.

```ts
import { defineConfig } from '@unextension/cli'

export default defineConfig({
  name: 'my-extension',
  displayName: 'My Extension',
  version: '0.1.0',
  commands: {
    allow: ['simpleBrowser.api.open', 'workbench.action.*'],
  },
})
```

In the example above, `simpleBrowser.api.open` is an exact match, while `workbench.action.*` matches any command with a single segment after `workbench.action.` (e.g. `workbench.action.openSettings`) but does not match deeper segments (e.g. `workbench.action.editor.openSettings`).

When a command is executed that does not match any entry in the allowlist, the request is rejected with the error `"Command not allowed: <id>"` and the command is not executed.
