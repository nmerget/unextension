---
title: Views
description: Register IDE views and tool windows for your extension.
---

The `views` option defines the IDE views (tool windows, panels, sidebar webviews) that your extension registers. Each view loads a route from your web app inside the IDE's native UI.

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
      id: 'panel',
      title: 'My Panel',
      route: '/panel',
      location: 'panel',
    },
  ],
})
```

## ViewConfig fields

| Field      | Type                               | Required | Description                                                                                   |
| ---------- | ---------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `id`       | `string`                           | Yes      | Unique identifier for this view (kebab-case)                                                  |
| `title`    | `string`                           | Yes      | Human-readable title shown in the IDE                                                         |
| `route`    | `string`                           | Yes      | Web route this view loads (e.g. `/`, `/panel`, `/toolbar/*`)                                  |
| `location` | `'sidebar' \| 'panel' \| 'editor'` | No       | Where to place the view in the IDE. Defaults to `'sidebar'`                                   |
| `icon`     | `string`                           | No       | Path to an SVG icon file relative to the project root. A default icon is generated if omitted |

## Locations

### `sidebar`

Registers the view as a sidebar webview panel.

- **VS Code**: Creates an activity bar icon and a `WebviewViewProvider`. The view appears in the sidebar when the user clicks the icon.
- **JetBrains**: Creates a tool window anchored to the right side of the IDE.

### `panel`

Registers the view as a bottom/auxiliary panel.

- **VS Code**: Creates a status bar item that opens a `WebviewPanel` in a new editor column when clicked.
- **JetBrains**: Creates a tool window anchored to the bottom of the IDE.

### `editor`

Same behavior as `panel` — opens in an editor-like context.

## Routes

The `route` field determines which page of your web app is loaded inside the view. In SPA mode, the route is passed to your app via `window.__UNEXTENSION_ROUTE__`.

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

### VS Code

The icon is used as the activity bar icon for sidebar views.

### JetBrains

The icon is used as the tool window icon in the IDE's sidebar strip.

## Multiple views

You can register multiple views with different locations:

```ts
import { defineConfig } from '@unextension/cli'

export default defineConfig({
  name: 'my-extension',
  displayName: 'My Extension',
  version: '0.1.0',
  views: [
    {
      id: 'main',
      title: 'Main View',
      route: '/',
      location: 'sidebar',
      icon: './src/assets/main.svg',
    },
    {
      id: 'output',
      title: 'Output Panel',
      route: '/output',
      location: 'panel',
    },
    {
      id: 'editor-view',
      title: 'Editor View',
      route: '/editor',
      location: 'editor',
    },
  ],
})
```

## Default behavior

When `views` is omitted entirely, the CLI generates a single default view:

- **VS Code**: A tool window with the extension's `displayName` as the title, loading the `/` route
- **JetBrains**: A tool window anchored to the right, loading the `/` route

This means a minimal config with no `views` still produces a working extension with a sidebar panel.
