# @unextension/cli

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
