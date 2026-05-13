---
title: Messaging
description: Send and receive messages between your web app and the IDE host using @unextension/bridge.
---

The bridge messaging API lets your web app send commands to the IDE host and receive responses back.

## `bridge.postMessage(type, payload?)`

Sends a fire-and-forget message to the IDE extension host. No reply is expected.

```ts
import { bridge } from '@unextension/bridge'

bridge.postMessage('openFile', { path: 'src/index.ts' })
bridge.postMessage('ping') // no payload needed
```

### Parameters

| Parameter | Type      | Required | Description                                  |
| --------- | --------- | -------- | -------------------------------------------- |
| `type`    | `string`  | ✅       | The message type / command name              |
| `payload` | `unknown` | —        | Optional data to send along with the message |

---

## `bridge.request(type, payload?)`

Sends a message to the IDE host and returns a `Promise` that resolves with the reply. Uses a `correlationId` to match the reply to the request.

```ts
import { bridge } from '@unextension/bridge'

const files = await bridge.request<string[]>('list-project-files', { pattern: '**/*.ts' })
```

This is the foundation all [built-in actions](./actions) are built on. Use it to implement custom actions.

### Parameters

| Parameter | Type      | Required | Description                     |
| --------- | --------- | -------- | ------------------------------- |
| `type`    | `string`  | ✅       | The message type / command name |
| `payload` | `unknown` | —        | Optional data to send           |

### Return value

`Promise<T>` — resolves with the `payload` field of the `type:reply` message.

---

## `bridge.onMessage(handler)`

Registers a handler for messages sent **from** the IDE host to the web app.

```ts
import { bridge } from '@unextension/bridge'

const unsubscribe = bridge.onMessage((message) => {
  console.log('Message from IDE:', message)
})

// Later — stop listening
unsubscribe()
```

### Parameters

| Parameter | Type                         | Description                                         |
| --------- | ---------------------------- | --------------------------------------------------- |
| `handler` | `(message: unknown) => void` | Called whenever a message is received from the host |

### Return value

Returns an **unsubscribe function** — call it to remove the handler.

---

## How messages route

| IDE       | Underlying mechanism                                  |
| --------- | ----------------------------------------------------- |
| VS Code   | `acquireVsCodeApi().postMessage` / `window.onmessage` |
| JetBrains | `window.__unextension_jb_bridge` / `window.onmessage` |
| Neither   | logs a warning (useful during browser development)    |

---

## React example

```tsx
import { useEffect } from 'react'
import { bridge } from '@unextension/bridge'

function MyView() {
  useEffect(() => {
    const unsub = bridge.onMessage((msg) => {
      console.log('Got:', msg)
    })
    return unsub // cleanup on unmount
  }, [])

  return (
    <button onClick={() => bridge.postMessage('hello', { from: 'MyView' })}>
      Say hello to IDE
    </button>
  )
}
```
