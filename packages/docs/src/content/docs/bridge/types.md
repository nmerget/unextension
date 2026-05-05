---
title: Types
description: TypeScript types and interfaces for @unextension/bridge.
---

## `Bridge`

The main bridge interface returned by `createBridge()` and exported as the `bridge` singleton.

```ts
interface Bridge {
  postMessage(type: string, payload?: unknown): void
  onMessage(handler: MessageHandler): () => void
}
```

## `MessageHandler`

The callback type passed to `bridge.onMessage`.

```ts
type MessageHandler = (message: unknown) => void
```

## Typing your messages

Since messages are typed as `unknown` by default, it's recommended to narrow the type in your handler. A common pattern is to use a discriminated union:

```ts
interface OpenFileMessage {
  type: 'openFile'
  payload: { path: string }
}

interface NotificationMessage {
  type: 'notification'
  payload: { text: string; level: 'info' | 'warning' | 'error' }
}

type IDEMessage = OpenFileMessage | NotificationMessage

bridge.onMessage((raw) => {
  const msg = raw as IDEMessage
  if (msg.type === 'openFile') {
    console.log('Open:', msg.payload.path)
  }
})
```

