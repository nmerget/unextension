---
title: Get Theme
description: Retrieve the current IDE theme color scheme and colors using @unextension/bridge.
---

The `getTheme` action retrieves the current theme information from the host IDE, including whether it's a dark or light theme and a set of semantic colors you can use to style your webview UI to match the IDE.

```ts
import { getTheme } from '@unextension/bridge'
```

---

## `getTheme()`

Returns the current IDE color scheme and theme colors.

```ts
const theme = await getTheme()
console.log(theme.colorScheme) // 'dark' or 'light'
console.log(theme.colors.background) // '#1e1e1e'
```

### Parameters

None.

### Return value

`Promise<ThemeResult>`

---

## `ThemeResult`

| Field         | Type                | Description                                    |
| ------------- | ------------------- | ---------------------------------------------- |
| `colorScheme` | `'dark' \| 'light'` | Whether the IDE is using a dark or light theme |
| `colors`      | `ThemeColors`       | Semantic color values from the IDE theme       |

---

## `ThemeColors`

All color fields are optional strings in CSS color format (typically hex like `#1e1e1e`).

| Field                 | Type     | Description                     |
| --------------------- | -------- | ------------------------------- |
| `background`          | `string` | Editor/panel background color   |
| `foreground`          | `string` | Default text color              |
| `inputBackground`     | `string` | Input field background color    |
| `inputForeground`     | `string` | Input field text color          |
| `border`              | `string` | Border color                    |
| `selectionBackground` | `string` | Text selection background color |
| `selectionForeground` | `string` | Text selection foreground color |
| `link`                | `string` | Link/hyperlink color            |
| `buttonBackground`    | `string` | Button background color         |
| `buttonForeground`    | `string` | Button text color               |

---

## Usage examples

### Basic theme detection

```ts
import { getTheme } from '@unextension/bridge'

const theme = await getTheme()

if (theme.colorScheme === 'dark') {
  document.body.classList.add('dark-mode')
} else {
  document.body.classList.add('light-mode')
}
```

### Applying theme colors to CSS variables

```ts
import { getTheme } from '@unextension/bridge'

const theme = await getTheme()

const root = document.documentElement
if (theme.colors.background) root.style.setProperty('--bg', theme.colors.background)
if (theme.colors.foreground) root.style.setProperty('--fg', theme.colors.foreground)
if (theme.colors.border) root.style.setProperty('--border', theme.colors.border)
```

### Styling buttons to match the IDE

```ts
import { getTheme } from '@unextension/bridge'

const { colors } = await getTheme()

const button = document.querySelector('button')
if (button && colors.buttonBackground) {
  button.style.backgroundColor = colors.buttonBackground
  button.style.color = colors.buttonForeground ?? '#ffffff'
}
```

---

## Types

All types are exported from `@unextension/bridge`:

```ts
import type { ThemeResult, ThemeColors } from '@unextension/bridge'
```

### `ThemeResult`

```ts
interface ThemeResult {
  colorScheme: 'dark' | 'light'
  colors: ThemeColors
}
```

### `ThemeColors`

```ts
interface ThemeColors {
  background?: string
  foreground?: string
  inputBackground?: string
  inputForeground?: string
  border?: string
  selectionBackground?: string
  selectionForeground?: string
  link?: string
  buttonBackground?: string
  buttonForeground?: string
}
```
