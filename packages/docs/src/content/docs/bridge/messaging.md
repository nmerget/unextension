---
title: Messaging
description: Send and receive messages between your web app and the IDE host using @unextension/bridge.
---

The bridge messaging API lets your web app send commands to the IDE host and receive responses back.

## `bridge.postMessage(type, payload?)`

Sends a message to the IDE extension host.

```ts
import { bridge } from '@unextension/bridge'

bridge.postMessage('openFile', { path: 'src/index.ts' })
bridge.postMessage('showNotification', { text: 'Hello from web app!' })
bridge.postMessage('ping') // no payload needed
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | `string` | ✅ | The message type / command name |
| `payload` | `unknown` | — | Optional data to send along with the message |

### How it routes

- **VS Code** — calls `acquireVsCodeApi().postMessage({ type, payload })`
- **JetBrains** — calls `window.__unextension_jb_bridge(JSON.stringify({ type, payload }))`
- **Neither** — logs a warning to the console (useful during development in a browser)

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

| Parameter | Type | Description |
|-----------|------|-------------|
| `handler` | `(message: unknown) => void` | Called whenever a message is received from the host |

### Return value

Returns an **unsubscribe function** — call it to remove the handler.

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

