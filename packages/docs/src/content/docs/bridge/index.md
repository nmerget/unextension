---
title: Bridge API
description: Overview of the @unextension/bridge runtime API for communicating with the IDE host.
---

The `@unextension/bridge` package is the **core of unextension** — it provides a unified API for your web app to communicate bidirectionally with the IDE extension host, regardless of whether it runs inside VS Code or JetBrains.

## Installation

```bash
npm install @unextension/bridge
# or
pnpm add @unextension/bridge
```

## How it works

Your web app runs inside a WebView. The bridge abstracts the different messaging APIs each IDE provides:

| IDE       | Underlying mechanism                                  |
| --------- | ----------------------------------------------------- |
| VS Code   | `acquireVsCodeApi().postMessage` / `window.onmessage` |
| JetBrains | `window.__unextension_jb_bridge` / `window.onmessage` |

You never need to think about which IDE you're in — just use the bridge.

## Quick example

```ts
import { bridge } from '@unextension/bridge'

// Send a message to the extension host
bridge.postMessage('openFile', { path: 'src/index.ts' })

// Listen for messages from the extension host
const unsubscribe = bridge.onMessage((message) => {
  console.log('Received from IDE:', message)
})

// Stop listening when done
unsubscribe()
```

## Sections

### Core

- [Messaging](./messaging) — `postMessage`, `onMessage` and `request`
- [Types](./types) — TypeScript interfaces and types

### File System

- [Actions](./actions) — `listProjectFiles`, `readProjectFile`, `writeProjectFile`
- [openFile](./open-file) — open a file in the IDE editor

### Editor & IDE

- [getActiveEditor](./get-active-editor) — get the currently active editor and selection
- [getDiagnostics](./get-diagnostics) — get lint/compile errors for a file
- [getTheme](./get-theme) — get the current IDE theme (light/dark)
- [Execute Command](./execute-command) — execute any IDE command (with cross-platform `unextension.*` commands)
- [Open in Simple Browser](./open-in-simple-browser) — open a URL in the IDE's built-in browser

### UI & Interaction

- [notify](./actions) — show native IDE notifications
- [showQuickPick](./show-quick-pick) — show a searchable picker dialog
- [Clipboard](./clipboard) — read/write the system clipboard

### Shell & Processes

- [runCommand](./actions) — run a shell command and get the output
- [spawnProcess](./spawn-process) — spawn a long-running process with streaming output
- [Scripts](./scripts) — writing and bundling Node.js scripts for `runScript`

### Help

- [Troubleshooting](./troubleshooting) — common issues and solutions
