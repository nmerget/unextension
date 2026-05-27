---
title: getTarget
description: Detect the current IDE platform and metadata using @unextension/bridge.
---

Returns information about the IDE your web app is running in, including the platform, name, and version.

```ts
import { getTarget } from '@unextension/bridge'
```

---

## `getTarget()`

```ts
const result = await getTarget()
console.log(result.target) // 'vscode' or 'jetbrains'
console.log(result.name) // e.g. 'Visual Studio Code', 'IntelliJ IDEA'
console.log(result.version) // e.g. '1.90.0', '2024.1.4'
```

### Return value

`Promise<TargetResult>`

| Field              | Type                        | Required | Description                                                     |
| ------------------ | --------------------------- | -------- | --------------------------------------------------------------- |
| `target`           | `'vscode'` \| `'jetbrains'` | Yes      | Platform family identifier                                      |
| `name`             | `string`                    | Yes      | IDE product name (e.g. "Visual Studio Code", "WebStorm")        |
| `version`          | `string`                    | Yes      | IDE version string (e.g. "1.90.0", "2024.1.4")                  |
| `buildNumber`      | `string`                    | No       | Build identifier (JetBrains build number, e.g. "243.21565.193") |
| `productCode`      | `string`                    | No       | IDE edition/host (e.g. "IU", "IC", "desktop", "web")            |
| `platform`         | `string`                    | No       | OS identifier (e.g. "win32", "darwin", "linux")                 |
| `extensionVersion` | `string`                    | No       | Version of the unextension host plugin/extension                |

:::note
Optional fields may be `undefined` depending on the IDE. Not all platforms provide all information — for example, `buildNumber` is only available in JetBrains.
:::

---

## Usage examples

### Basic platform detection

```ts
import { getTarget } from '@unextension/bridge'

const { target } = await getTarget()

if (target === 'vscode') {
  console.log('Running in VS Code')
} else {
  console.log('Running in JetBrains')
}
```

### Accessing extended metadata

```ts
const result = await getTarget()

console.log(`IDE: ${result.name} ${result.version}`)
console.log(`Platform: ${result.platform}`)
console.log(`Extension version: ${result.extensionVersion}`)

if (result.productCode) {
  console.log(`Product code: ${result.productCode}`)
}
```

### Conditional native command execution

Use `getTarget()` to run platform-specific commands that aren't available as `unextension.*` abstractions:

```ts
import { executeCommand, getTarget } from '@unextension/bridge'

const { target } = await getTarget()

if (target === 'vscode') {
  await executeCommand('editor.action.formatDocument')
} else {
  // JetBrains only supports unextension.* commands
}
```

See [executeCommand — Platform-specific commands](./execute-command#platform-specific-commands) for more details.

---

## Types

```ts
import type { TargetResult } from '@unextension/bridge'
```

### `TargetResult`

```ts
interface TargetResult {
  target: 'vscode' | 'jetbrains'
  name: string
  version: string
  /** IDE build identifier (JetBrains build number) */
  buildNumber?: string
  /** IDE product code / app host (e.g. "IU", "IC", "desktop", "web") */
  productCode?: string
  /** OS platform identifier (e.g. "win32", "darwin", "linux") */
  platform?: string
  /** Version of the unextension host extension/plugin */
  extensionVersion?: string
}
```
