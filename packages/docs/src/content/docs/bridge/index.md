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

| IDE | Underlying mechanism |
|-----|---------------------|
| VS Code | `acquireVsCodeApi().postMessage` / `window.onmessage` |
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

- [Messaging](./messaging) — `postMessage` and `onMessage`
- [Types](./types) — TypeScript interfaces and types

