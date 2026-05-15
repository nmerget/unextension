---
'@unextension/bridge': minor
'@unextension/cli': minor
---

feat: add bridge actions (clipboard, getActiveEditor, getDiagnostics, getTheme, openFile, showQuickPick)

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
