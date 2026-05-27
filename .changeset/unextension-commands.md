---
'@unextension/bridge': minor
'@unextension/cli': minor
---

feat: add cross-platform unextension.\* command abstraction layer

- Added 26 `unextension.*` commands that work identically in VS Code and JetBrains
- VS Code handler maps unextension commands to native equivalents before execution
- JetBrains handler only accepts unextension.\* commands (rejects others with guidance error)
- Refactored `openInSimpleBrowser` to use `unextension.openInBrowser` internally
- Added `UnextensionCommand` TypeScript type for autocomplete support
- JetBrains `openInBrowser` tries built-in browser first, falls back to system browser
- Updated documentation with categorized sidebar, cross-platform commands table, and troubleshooting guide
