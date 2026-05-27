# @unextension/cli

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
