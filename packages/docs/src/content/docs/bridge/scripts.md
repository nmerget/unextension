---
title: Scripts
description: Run Node.js scripts on the IDE host machine from your web app using runScript.
---

Scripts let you run arbitrary Node.js code on the IDE host machine. They live in a `scripts/` folder in your project, are copied into the extension output during `unextension sync`, and are called from the webview via [`runScript`](./actions#runscriptname-payload).

Scripts run with full Node.js access — filesystem, network, child processes, installed packages — with no sandbox.

---

## Setup

Add `scriptsDir` to your `unextension.config.ts`:

```ts
import { defineConfig } from '@unextension/cli'

export default defineConfig({
  name: 'my-extension',
  // ...
  scriptsDir: './dist/scripts', // compiled output, not source
})
```

---

## Approach 1 — TypeScript with esbuild (recommended)

Write scripts in TypeScript and bundle them into self-contained files using esbuild. Each script is bundled with all its imports inlined, so no `node_modules` is needed at runtime inside the extension.

### Project structure

```
my-extension/
  scripts/
    build.mjs       ← esbuild bundler
    hello.ts        ← your script source
  dist/
    scripts/
      hello.js      ← bundled output (copied to extension)
```

### Install esbuild

```bash
pnpm add -D esbuild @types/node
```

### `scripts/build.mjs`

```js
import { build } from 'esbuild'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const outDir = join(scriptsDir, '../dist/scripts')

const entries = readdirSync(scriptsDir)
  .filter((f) => f.endsWith('.ts') && f !== 'build.mjs')
  .map((f) => join(scriptsDir, f))

if (entries.length > 0) {
  await build({
    entryPoints: entries,
    outdir: outDir,
    bundle: true, // inline all imports — no node_modules needed at runtime
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    external: [],
  })
}
```

### `package.json` build script

```json
{
  "scripts": {
    "build": "vite build && node scripts/build.mjs && unextension sync"
  }
}
```

### Writing a script with `createScript`

Use `createScript` from `@unextension/bridge/script` to handle the payload/result boilerplate:

```ts
// scripts/hello.ts
import { createScript } from '@unextension/bridge/script'

createScript(async (payload: { name: string }) => {
  return {
    greeting: `Hello, ${payload.name}!`,
    nodeVersion: process.version,
    cwd: process.cwd(),
  }
})
```

Call it from the webview:

```ts
import { runScript } from '@unextension/bridge'

const result = await runScript('hello', { name: 'World' })
console.log(result.result) // { greeting: 'Hello, World!', nodeVersion: 'v20.x.x', ... }
```

---

## Approach 2 — Plain JavaScript

If you don't need TypeScript, write scripts as plain `.js` files and point `scriptsDir` directly at your scripts folder:

```ts
// unextension.config.ts
export default defineConfig({
  scriptsDir: './scripts',
})
```

### Contract

Scripts communicate via:

- **Input** — `process.env.UNEXTENSION_PAYLOAD` — a JSON string of the payload passed to `runScript`
- **Output** — write a JSON string to `process.stdout` — this becomes `result.result`
- **Errors** — write to `process.stderr` and/or exit with a non-zero code

```js
// scripts/hello.js
const payload = JSON.parse(process.env.UNEXTENSION_PAYLOAD ?? 'null')

const result = {
  greeting: `Hello, ${payload?.name ?? 'World'}!`,
  nodeVersion: process.version,
}

process.stdout.write(JSON.stringify(result))
```

### `createScript` without TypeScript

You can also use `createScript` in plain JS:

```js
// scripts/hello.js
const { createScript } = require('@unextension/bridge/script')

createScript(async (payload) => {
  return {
    greeting: `Hello, ${payload?.name ?? 'World'}!`,
    nodeVersion: process.version,
  }
})
```

:::note
Plain JS scripts that `require` external packages must bundle them first (e.g. with esbuild) since `node_modules` is not available inside the extension output.
:::

---

## `createScript` API

```ts
import { createScript } from '@unextension/bridge/script'

createScript<TPayload, TResult>(
  handler: (payload: TPayload) => TResult | Promise<TResult>
): Promise<void>
```

| Parameter | Type                                                 | Description                                            |
| --------- | ---------------------------------------------------- | ------------------------------------------------------ |
| `handler` | `(payload: TPayload) => TResult \| Promise<TResult>` | Your script logic. Return any JSON-serializable value. |

`createScript` handles:

- Parsing `UNEXTENSION_PAYLOAD` from the environment
- Calling your handler with the typed payload
- Writing the result as JSON to stdout
- Catching errors, writing to stderr, and exiting with code `1`
