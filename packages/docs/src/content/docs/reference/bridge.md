---
title: Bridge API
description: Reference for the @unextension/bridge runtime API.
---

The `@unextension/bridge` package provides a unified API for your web app to communicate with the host IDE, regardless of whether it runs inside VS Code or JetBrains.

## Installation

```bash
npm install @unextension/bridge
# or
pnpm add @unextension/bridge
```

## Usage

```ts
import { bridge } from '@unextension/bridge'

// Send a message to the extension host
bridge.postMessage('myCommand', { file: 'index.ts' })

// Listen for messages from the extension host
const unsubscribe = bridge.onMessage((message) => {
  console.log('Received:', message)
})

// Stop listening
unsubscribe()
```

## API

### `bridge.postMessage(type, payload?)`

Sends a message to the IDE extension host.

| Parameter | Type      | Description                     |
| --------- | --------- | ------------------------------- |
| `type`    | `string`  | The message type / command name |
| `payload` | `unknown` | Optional data to send           |

Internally routes to `acquireVsCodeApi().postMessage` on VS Code, or `__unextension_jb_bridge` on JetBrains.

### `bridge.onMessage(handler)`

Registers a handler for messages sent from the IDE host to the webview.

Returns an unsubscribe function.

| Parameter | Type                         | Description                           |
| --------- | ---------------------------- | ------------------------------------- |
| `handler` | `(message: unknown) => void` | Called whenever a message is received |

## Types

```ts
interface Bridge {
  postMessage(type: string, payload?: unknown): void
  onMessage(handler: MessageHandler): () => void
}

type MessageHandler = (message: unknown) => void
```
