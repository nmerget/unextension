# @unextension/cli

## 0.5.1

### Patch Changes

- [#19](https://github.com/nmerget/unextension/pull/19) [`5f25f79`](https://github.com/nmerget/unextension/commit/5f25f79284100deb77d29ef7a09f2a3505c346cd) Thanks [@nmerget](https://github.com/nmerget)! - Fix spawn-process handler failing on Windows when the command path contains surrounding quotes

## 0.5.0

### Minor Changes

- [#17](https://github.com/nmerget/unextension/pull/17) [`67bdc9c`](https://github.com/nmerget/unextension/commit/67bdc9c492b363a1a715706a4e30c86fe3ab3104) Thanks [@nmerget](https://github.com/nmerget)! - Add `openDiff` bridge action for native diff editor integration
  - New `openDiff` function exported from `@unextension/bridge` that opens the IDE's native diff editor and returns a Promise resolving when the user accepts or rejects changes
  - Supports whole-file and per-hunk accept/reject with `HunkDecision` array
  - `autoApply` option to automatically write accepted changes to disk
  - VS Code handler using `TextDocumentContentProvider` and `CodeLensProvider` for per-hunk controls
  - JetBrains handler using `DiffManager` with notification-based Accept/Reject actions
  - Full TypeScript types: `OpenDiffPayload`, `OpenDiffResult`, `HunkDecision`

## 0.4.0

### Minor Changes

- [#14](https://github.com/nmerget/unextension/pull/14) [`353ff93`](https://github.com/nmerget/unextension/commit/353ff937b7a242f2eb8047302dcc47c8546bbd86) Thanks [@nmerget](https://github.com/nmerget)! - feat: add plugin settings support

  Extension authors can now define configurable settings in `unextension.config.ts`. Settings are scaffolded into each target IDE's native settings infrastructure:
  - **VS Code**: `contributes.configuration` in `package.json` with settings change listener
  - **JetBrains**: `SettingsConfigurable.kt` with `PersistentStateComponent` for persistence

  A new `useSettings()` bridge action provides a reactive store that auto-updates when the user changes settings in the IDE.

  ### New APIs
  - `useSettings(defaults)` — creates a reactive `SettingsStore` with `get()` and `subscribe()` methods
  - `SettingDefinition` types: `string`, `number`, `boolean`, `enum`
  - `validateSettings()` — validates settings at build time (key format, type/default consistency, enum options)

  ### CLI changes
  - Settings validation runs during `unextension build` and `unextension sync`
  - VS Code target generates `contributes.configuration` and `get-settings.js` action handler
  - JetBrains target generates `AppSettingsState.kt`, `ProjectSettingsState.kt`, `SettingsConfigurable.kt`, and `GetSettings.kt`

- [#14](https://github.com/nmerget/unextension/pull/14) [`353ff93`](https://github.com/nmerget/unextension/commit/353ff937b7a242f2eb8047302dcc47c8546bbd86) Thanks [@nmerget](https://github.com/nmerget)! - feat: add view location system with sidebar, panel, and toolbar support

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

## 0.3.0

### Minor Changes

- [#12](https://github.com/nmerget/unextension/pull/12) [`6a5b080`](https://github.com/nmerget/unextension/commit/6a5b080ac08dd7114ef2fc95ed239fdb15ecc4e6) Thanks [@nmerget](https://github.com/nmerget)! - feat: add cross-platform unextension.\* command abstraction layer
  - Added 26 `unextension.*` commands that work identically in VS Code and JetBrains
  - VS Code handler maps unextension commands to native equivalents before execution
  - JetBrains handler only accepts unextension.\* commands (rejects others with guidance error)
  - Refactored `openInSimpleBrowser` to use `unextension.openInBrowser` internally
  - Added `UnextensionCommand` TypeScript type for autocomplete support
  - JetBrains `openInBrowser` tries built-in browser first, falls back to system browser
  - Updated documentation with categorized sidebar, cross-platform commands table, and troubleshooting guide

## 0.2.0

### Minor Changes

- [#5](https://github.com/nmerget/unextension/pull/5) [`3f0589c`](https://github.com/nmerget/unextension/commit/3f0589c3f75031c7afd45768215261c58792e83f) Thanks [@nmerget](https://github.com/nmerget)! - feat: add bridge actions (clipboard, getActiveEditor, getDiagnostics, getTheme, openFile, showQuickPick)

  Add all bridge actions spanning the bridge layer, VS Code target, and JetBrains target:
  - `getClipboard` / `setClipboard` — read/write system clipboard
  - `getActiveEditor` — get active editor info (path, language, selection, content)
  - `getDiagnostics` — get lint/compile diagnostics from the IDE
  - `getTheme` — get IDE color scheme and theme colors
  - `openFile` — open a file with optional cursor/selection positioning
  - `showQuickPick` — present a selection list via native IDE quick-pick UI

  Also includes:
  - JetBrains threading fixes (runReadAction, invokeAndWait)
  - JetBrains IntelliJ 2025.1 compatibility (DocumentMarkupModel)
  - Toolwindow template backslash escaping fix
  - Property-based tests and unit tests for all actions
  - Showcase KitchenSink test buttons
  - Documentation pages for all new actions

## 0.1.0

### Minor Changes

- [`ba1d3e6`](https://github.com/nmerget/unextension/commit/ba1d3e60b6650300196656bcd4e7f0704117613f) Thanks [@nmerget](https://github.com/nmerget)! - Initial release of `@unextension/cli` and `@unextension/bridge`.
