---
title: Views
description: Register IDE views and tool windows for your extension.
---

The `views` option defines the IDE views (tool windows, panels, editor tabs) that your extension registers. Each view loads a route from your web app inside the IDE's native UI.

When `views` is omitted, the extension registers a single sidebar view that loads the `/` route.

## Quick example

```ts
import { defineConfig } from '@unextension/cli'

export default defineConfig({
  name: 'my-extension',
  displayName: 'My Extension',
  version: '0.1.0',
  views: [
    {
      id: 'explorer',
      title: 'My Explorer',
      route: '/',
      location: 'sidebar',
      icon: './src/assets/icon.svg',
    },
    {
      id: 'output',
      title: 'My Output',
      route: '/output',
      location: 'panel',
    },
    {
      id: 'editor',
      title: 'My Editor View',
      route: '/editor',
      location: 'toolbar',
      icon: './src/assets/editor.svg',
      toolbar: {
        openIn: 'editor',
        vsCodeIcon: 'browser',
      },
    },
  ],
})
```

## ViewConfig fields

| Field      | Type                                | Required | Description                                                                                   |
| ---------- | ----------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `id`       | `string`                            | Yes      | Unique identifier for this view (kebab-case)                                                  |
| `title`    | `string`                            | Yes      | Human-readable title shown in the IDE                                                         |
| `route`    | `string`                            | Yes      | Web route this view loads (e.g. `/`, `/panel`, `/editor/*`)                                   |
| `location` | `'sidebar' \| 'panel' \| 'toolbar'` | No       | Where the view lives in the IDE. Defaults to `'sidebar'`                                      |
| `icon`     | `string`                            | No       | Path to an SVG icon file relative to the project root. A default icon is generated if omitted |
| `toolbar`  | `ToolbarConfig`                     | No       | Toolbar-specific configuration. Only used when `location` is `'toolbar'`                      |

### `ToolbarConfig`

| Field        | Type                    | Required | Description                                                                                                                                         |
| ------------ | ----------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openIn`     | `'editor' \| 'sidebar'` | No       | Where the webview opens when triggered. Defaults to `'editor'`                                                                                      |
| `vsCodeIcon` | `VSCodeIcon`            | No       | VS Code [codicon](https://code.visualstudio.com/api/references/icons-in-labels) name for the status bar item. JetBrains uses the `icon` SVG instead |

## Locations

### `sidebar`

Renders the webview inline in the sidebar.

- **VS Code**: Creates an activity bar icon and a `WebviewViewProvider`. The view appears in the sidebar when the user clicks the icon.
- **JetBrains**: Creates a tool window anchored to the right side of the IDE.

```ts
{
  id: 'explorer',
  title: 'Explorer',
  route: '/',
  location: 'sidebar',
}
```

### `panel`

Renders the webview inline in the bottom panel.

- **VS Code**: Creates a tab in the bottom panel area (alongside Output, Terminal, Problems).
- **JetBrains**: Creates a tool window anchored to the bottom of the IDE.

```ts
{
  id: 'output',
  title: 'Output',
  route: '/output',
  location: 'panel',
}
```

### `toolbar`

Adds an icon button to the toolbar. Clicking it opens the webview in the location specified by `toolbar.openIn`.

- **VS Code**: Creates a status bar item (bottom) with a [codicon](https://code.visualstudio.com/api/references/icons-in-labels) that opens a WebviewPanel when clicked.
- **JetBrains**: Creates a main toolbar icon (top right) using the `icon` SVG, and a Tools menu entry.

```ts
{
  id: 'editor-view',
  title: 'Editor View',
  route: '/editor',
  location: 'toolbar',
  icon: './src/assets/editor.svg',
  toolbar: {
    openIn: 'editor',
    vsCodeIcon: 'browser',
  },
}
```

## `toolbar` config

Controls toolbar-specific behavior. Only applies when `location` is `'toolbar'`.

### `toolbar.openIn`

| Value     | VS Code                                                 | JetBrains                       |
| --------- | ------------------------------------------------------- | ------------------------------- |
| `editor`  | Opens in the main editor area (center, like a file tab) | Opens in an editor tab (center) |
| `sidebar` | Opens beside the active editor (split view)             | Opens in an editor tab (center) |

Default: `'editor'`

### `toolbar.vsCodeIcon`

A [VS Code codicon](https://code.visualstudio.com/api/references/icons-in-labels) name displayed in the status bar item. The type provides autocomplete for common icons like `'browser'`, `'preview'`, `'terminal'`, `'globe'`, etc.

JetBrains ignores this field — it uses the `icon` SVG file instead.

```ts
toolbar: {
  vsCodeIcon: 'browser', // Shows $(browser) icon in VS Code status bar
}
```

## Routes

The `route` field determines which page of your web app is loaded inside the view. The route is passed to your app via `window.__UNEXTENSION_ROUTE__`.

You can use a wildcard suffix (`/*`) to indicate that the view handles sub-routes:

```ts
{
  id: 'docs',
  title: 'Documentation',
  route: '/docs/*',
  location: 'panel',
}
```

## Icons

Each view can have a custom SVG icon. Provide a path relative to your project root:

```ts
{
  id: 'explorer',
  title: 'Explorer',
  route: '/',
  icon: './src/assets/sidebar-icon.svg',
}
```

If `icon` is omitted, unextension generates a default icon using the first letter of the view's title.

### Icon requirements

Icons must be **SVG** files. During sync, unextension automatically scales icons to the correct size for each target:

| Target    | Size  | Notes                                                                                                               |
| --------- | ----- | ------------------------------------------------------------------------------------------------------------------- |
| VS Code   | Any   | VS Code handles SVG scaling automatically                                                                           |
| JetBrains | 16×16 | Icons are scaled to 16×16 during sync. The `viewBox` is preserved so the icon renders correctly at the smaller size |

For best results with JetBrains:

- Use simple, monochrome SVG icons (single color on transparent background)
- Avoid complex gradients or filters — they may not render well at 16×16
- Use `currentColor` as the fill/stroke color so the icon adapts to light/dark themes
- Include a `viewBox` attribute so the icon scales proportionally

Example of a well-structured icon:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="10"/>
</svg>
```

### VS Code

- `sidebar`: Icon appears in the activity bar
- `toolbar`: Icon appears in the status bar (text-based, not SVG)

### JetBrains

- `sidebar`/`panel`: Icon appears in the tool window strip (scaled to 13×13)
- `toolbar`: Icon appears in the main toolbar (scaled to 16×16)

## Default behavior

When `views` is omitted entirely, the CLI generates a single default view:

- Location: `sidebar`
- Route: `/`
- Title: extension's `displayName`

This means a minimal config with no `views` still produces a working extension with a sidebar panel.

## Full example

```ts
import { defineConfig } from '@unextension/cli'

export default defineConfig({
  name: 'my-extension',
  displayName: 'My Extension',
  version: '0.1.0',
  views: [
    // Sidebar: inline webview in the sidebar
    {
      id: 'main',
      title: 'Main View',
      route: '/',
      location: 'sidebar',
      icon: './src/assets/main.svg',
    },
    // Panel: inline webview in the bottom panel
    {
      id: 'output',
      title: 'Output Panel',
      route: '/output',
      location: 'panel',
    },
    // Toolbar → editor: toolbar button opens in center editor area
    {
      id: 'editor-view',
      title: 'Editor View',
      route: '/editor',
      location: 'toolbar',
      icon: './src/assets/editor.svg',
      toolbar: { openIn: 'editor', vsCodeIcon: 'browser' },
    },
    // Toolbar → sidebar: toolbar button opens beside active editor
    {
      id: 'side-view',
      title: 'Side View',
      route: '/side',
      location: 'toolbar',
      icon: './src/assets/side.svg',
      toolbar: { openIn: 'sidebar', vsCodeIcon: 'preview' },
    },
  ],
})
```
