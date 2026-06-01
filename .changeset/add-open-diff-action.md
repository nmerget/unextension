---
'@unextension/bridge': minor
'@unextension/cli': minor
---

Add `openDiff` bridge action for native diff editor integration

- New `openDiff` function exported from `@unextension/bridge` that opens the IDE's native diff editor and returns a Promise resolving when the user accepts or rejects changes
- Supports whole-file and per-hunk accept/reject with `HunkDecision` array
- `autoApply` option to automatically write accepted changes to disk
- VS Code handler using `TextDocumentContentProvider` and `CodeLensProvider` for per-hunk controls
- JetBrains handler using `DiffManager` with notification-based Accept/Reject actions
- Full TypeScript types: `OpenDiffPayload`, `OpenDiffResult`, `HunkDecision`
