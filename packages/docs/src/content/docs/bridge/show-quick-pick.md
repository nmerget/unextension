---
title: showQuickPick
description: Present a selection list to the user via the host IDE's native quick-pick UI using @unextension/bridge.
---

The `showQuickPick` action presents a selection list to the user through the host IDE's native quick-pick / popup-list UI. It supports single-select and multi-select modes, accepts items as plain strings or structured `QuickPickItem` objects, and returns the user's selection (or `null` on cancellation).

```ts
import { showQuickPick } from '@unextension/bridge'
```

---

## `showQuickPick(items, options?)`

Displays a quick-pick dialog and returns the user's selection.

```ts
const result = await showQuickPick(['TypeScript', 'JavaScript', 'Rust'])
console.log(result.selected) // { label: 'TypeScript', value: 'TypeScript' }
```

### Parameters

| Parameter | Type                          | Description                            |
| --------- | ----------------------------- | -------------------------------------- |
| `items`   | `string[] \| QuickPickItem[]` | The items to display in the quick-pick |
| `options` | `QuickPickOptions`            | Optional configuration for the dialog  |

When `items` is a `string[]`, each string is automatically converted to a `QuickPickItem` with both `label` and `value` set to the string.

### `QuickPickItem`

| Field         | Type     | Required | Description                                     |
| ------------- | -------- | -------- | ----------------------------------------------- |
| `label`       | `string` | Yes      | Displayed text for the item                     |
| `description` | `string` | No       | Secondary text shown beside the label           |
| `detail`      | `string` | No       | Additional detail shown below the label         |
| `value`       | `string` | No       | Return value for the item (defaults to `label`) |

### `QuickPickOptions`

| Option        | Type      | Description                                  |
| ------------- | --------- | -------------------------------------------- |
| `placeholder` | `string`  | Placeholder text in the filter input         |
| `title`       | `string`  | Title shown above the list                   |
| `canPickMany` | `boolean` | Enables multi-select mode (default: `false`) |

### Return value

`Promise<QuickPickResult>`

| Field      | Type                                       | Description                                |
| ---------- | ------------------------------------------ | ------------------------------------------ |
| `selected` | `QuickPickItem \| QuickPickItem[] \| null` | The chosen item(s), or `null` if cancelled |

In single-select mode, `selected` is a single `QuickPickItem` or `null`.
In multi-select mode (`canPickMany: true`), `selected` is a `QuickPickItem[]` or `null`.

---

## Usage examples

### Simple string array

```ts
const result = await showQuickPick(['Option A', 'Option B', 'Option C'])

if (result.selected) {
  console.log('Chosen:', result.selected.label)
}
```

### QuickPickItem array with descriptions

```ts
const result = await showQuickPick(
  [
    { label: 'TypeScript', description: 'Typed JavaScript', value: 'ts' },
    { label: 'JavaScript', description: 'Dynamic language', value: 'js' },
    { label: 'Rust', description: 'Systems language', value: 'rs' },
  ],
  { title: 'Pick a language', placeholder: 'Search languages...' },
)

if (result.selected) {
  console.log('Value:', result.selected.value) // 'ts', 'js', or 'rs'
}
```

### Multi-select mode

```ts
const result = await showQuickPick(
  [
    { label: 'ESLint', value: 'eslint' },
    { label: 'Prettier', value: 'prettier' },
    { label: 'TypeScript', value: 'typescript' },
  ],
  { title: 'Select tools to install', canPickMany: true },
)

if (result.selected) {
  // selected is QuickPickItem[] in multi-select mode
  const tools = result.selected.map((item) => item.value)
  console.log('Installing:', tools)
}
```

### Handling cancellation

```ts
const result = await showQuickPick(['Yes', 'No'])

if (result.selected === null) {
  console.log('User cancelled the dialog')
  return
}

console.log('User chose:', result.selected.label)
```

---

## Error handling

`showQuickPick` resolves with `{ selected: null }` when the user dismisses the dialog. It does not reject the promise on cancellation.

| Scenario                        | Result                            |
| ------------------------------- | --------------------------------- |
| User selects an item            | `{ selected: QuickPickItem }`     |
| User selects multiple items     | `{ selected: QuickPickItem[] }`   |
| User cancels / dismisses dialog | `{ selected: null }`              |
| Empty items array               | Shows empty list, cancel → `null` |

---

## Types

All types are exported from `@unextension/bridge`:

```ts
import type { QuickPickItem, QuickPickOptions, QuickPickResult } from '@unextension/bridge'
```

### `QuickPickItem`

```ts
interface QuickPickItem {
  label: string
  description?: string
  detail?: string
  value?: string
}
```

### `QuickPickOptions`

```ts
interface QuickPickOptions {
  placeholder?: string
  title?: string
  canPickMany?: boolean
}
```

### `QuickPickResult`

```ts
interface QuickPickResult {
  selected: QuickPickItem | QuickPickItem[] | null
}
```
