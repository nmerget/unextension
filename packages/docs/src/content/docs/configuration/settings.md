---
title: Settings
description: Define configurable settings for your extension that appear in the IDE's native settings UI.
---

The `settings` option in your config lets you declare configurable settings that are scaffolded into each target IDE's native settings infrastructure. Users can modify these settings through VS Code's Settings editor or JetBrains' Preferences dialog, and your webview can read them reactively via the [`useSettings()`](/bridge/settings) bridge action.

## Quick example

```ts
import { defineConfig } from '@unextension/cli'

export default defineConfig({
  name: 'my-extension',
  displayName: 'My Extension',
  version: '0.1.0',
  settings: [
    {
      key: 'editor.fontSize',
      type: 'number',
      default: 14,
      description: 'Font size in pixels for the editor view',
      title: 'Editor Font Size',
    },
    {
      key: 'general.theme',
      type: 'enum',
      default: 'system',
      description: 'Color theme for the extension UI',
      options: ['light', 'dark', 'system'],
    },
  ],
})
```

## SettingDefinition fields

| Field         | Type                                          | Required        | Description                                                          |
| ------------- | --------------------------------------------- | --------------- | -------------------------------------------------------------------- |
| `key`         | `string`                                      | Yes             | Setting identifier in dot-notation format (e.g. `"editor.fontSize"`) |
| `type`        | `'string' \| 'number' \| 'boolean' \| 'enum'` | Yes             | The data type of the setting                                         |
| `default`     | `string \| number \| boolean`                 | Yes             | Default value — must match the declared `type`                       |
| `description` | `string`                                      | Yes             | Human-readable description shown in the IDE settings UI              |
| `scope`       | `'global' \| 'workspace'`                     | No              | Where the setting is stored. Defaults to `'global'`                  |
| `title`       | `string`                                      | No              | Optional human-readable label for the setting                        |
| `options`     | `string[]`                                    | Only for `enum` | Available choices when `type` is `'enum'`                            |

## Setting types

### `string`

A free-text value. The `default` must be a string.

```ts
{
  key: 'general.greeting',
  type: 'string',
  default: 'Hello',
  description: 'Greeting message shown on startup',
}
```

### `number`

A numeric value. The `default` must be a number.

```ts
{
  key: 'editor.fontSize',
  type: 'number',
  default: 14,
  description: 'Font size in pixels',
}
```

### `boolean`

A toggle. The `default` must be `true` or `false`.

```ts
{
  key: 'editor.wordWrap',
  type: 'boolean',
  default: true,
  description: 'Whether to wrap long lines',
}
```

### `enum`

A dropdown with predefined choices. The `default` must be one of the values in `options`.

```ts
{
  key: 'general.theme',
  type: 'enum',
  default: 'system',
  description: 'Color theme for the extension UI',
  options: ['light', 'dark', 'system'],
}
```

## Scope

The `scope` field controls where the setting is persisted:

| Scope       | VS Code                 | JetBrains                 |
| ----------- | ----------------------- | ------------------------- |
| `global`    | Application-level scope | Application-level service |
| `workspace` | Resource-level scope    | Project-level service     |

When `scope` is omitted, it defaults to `'global'`.

- **Global** settings are shared across all projects/workspaces. Use for user preferences like font size or theme.
- **Workspace** settings are specific to a project. Use for project-specific configuration like auto-save behavior.

## Key format

Setting keys must be in **dot-notation** format: one or more alphanumeric segments (starting with a letter) separated by dots.

Valid keys: `fontSize`, `editor.fontSize`, `general.ui.theme`

Invalid keys: `my-setting` (hyphens), `1setting` (starts with number), `a..b` (empty segment)

## IDE behavior

### VS Code

Settings are scaffolded into `contributes.configuration` in the generated `package.json`. Each key is prefixed with the extension name (e.g. `my-extension.editor.fontSize`). Users see them in the VS Code Settings editor under the extension's display name.

### JetBrains

Settings are scaffolded into a Kotlin `SettingsConfigurable` class that renders a native settings panel. The panel appears under **Settings → Tools → [Extension Display Name]**. Settings are persisted using IntelliJ's `PersistentStateComponent` API.

## Build-time validation

The CLI validates settings during `unextension build` and `unextension sync`. Errors are reported for:

- Invalid key format (not dot-notation)
- Duplicate setting keys
- Type/default mismatch (e.g. `type: 'number'` with a string default)
- Enum default not present in the `options` array
- Enum with an empty `options` array

## Reading settings at runtime

Use the [`useSettings()`](/bridge/settings) bridge action to read settings reactively in your webview:

```ts
import { useSettings } from '@unextension/bridge'

const settings = useSettings({
  'editor.fontSize': 14,
  'general.theme': 'system',
})

// Read current values
console.log(settings.get())

// React to changes
settings.subscribe((updated) => {
  console.log('Settings changed:', updated)
})
```

## Full example

```ts
import { defineConfig } from '@unextension/cli'

export default defineConfig({
  name: 'my-extension',
  displayName: 'My Extension',
  version: '0.1.0',
  targets: ['vscode', 'jetbrains'],
  settings: [
    {
      key: 'editor.fontSize',
      type: 'number',
      default: 14,
      description: 'Font size in pixels for the editor view',
      title: 'Editor Font Size',
      scope: 'global',
    },
    {
      key: 'general.greeting',
      type: 'string',
      default: 'Hello',
      description: 'Greeting message shown on startup',
      scope: 'workspace',
    },
    {
      key: 'editor.wordWrap',
      type: 'boolean',
      default: true,
      description: 'Whether to wrap long lines in the editor',
    },
    {
      key: 'general.theme',
      type: 'enum',
      default: 'system',
      description: 'Color theme for the extension UI',
      options: ['light', 'dark', 'system'],
    },
  ],
})
```
