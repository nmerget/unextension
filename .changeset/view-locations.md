---
'@unextension/cli': minor
---

feat: add view location system with sidebar, panel, and toolbar support

Views now support three locations with distinct IDE behavior:

- `sidebar` — inline webview in the sidebar (VS Code activity bar, JetBrains right tool window)
- `panel` — inline webview in the bottom panel (VS Code bottom panel, JetBrains bottom tool window)
- `toolbar` — icon button that opens a webview (VS Code status bar, JetBrains main toolbar + Tools menu)

### Toolbar views

Toolbar views use a `toolbar` config object:

- `toolbar.openIn` — where the webview opens: `'editor'` (center tabs) or `'sidebar'` (beside)
- `toolbar.vsCodeIcon` — VS Code codicon name for the status bar item (typed with autocomplete)

JetBrains toolbar views use the `icon` SVG (auto-scaled to 16×16) and open in editor tabs via FileEditorProvider.

### Other changes

- Removed `spa`, `serverEntry`, `serverPort` from config (always SPA)
- Added `shellPath` to root config
- Added `ViewLocation`, `ToolbarConfig`, `ToolbarOpenIn`, `VSCodeIcon` types
- VS Code panel views now render in the bottom panel (not sidebar)
- JetBrains tool window icons now load correctly (registered in plugin.xml)
- Added views and settings documentation as separate pages
