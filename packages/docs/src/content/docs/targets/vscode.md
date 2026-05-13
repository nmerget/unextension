---
title: VS Code
description: How unextension generates and builds VS Code extensions.
---

## Output structure

After running `unextension sync`, the `output/vscode/` directory contains:

```
output/vscode/
  extension.js       # VS Code extension entry point
  package.json       # Extension manifest
  .vscodeignore      # Controls which files are included in the package
  LICENSE            # Auto-generated license file
  webview/           # Your built web app
```

## Building

Run `unextension build vscode` or the npm script in your project:

```bash
npx unextension build vscode
```

This runs `npm install` (to get `@vscode/vsce`) and then `vsce package` to produce a `.vsix` file inside `output/vscode/`.

## Installing locally

### Via the UI

1. Open the **Extensions** panel in VS Code (`Ctrl+Shift+X`)
2. Click the `...` menu → **Install from VSIX...**
3. Select the generated `.vsix` file from `output/vscode/`

### Via the CLI

```bash
code --install-extension output/vscode/your-extension-0.0.1.vsix
```

## Publishing to the VS Code Marketplace

### 1. Create a publisher

Go to [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage) and create a publisher account.

### 2. Get a Personal Access Token

In [Azure DevOps](https://dev.azure.com), create a PAT with the **Marketplace → Manage** scope.

### 3. Publish

```bash
cd output/vscode
npx vsce publish --pat <your-token>
```

Or log in once and publish:

```bash
npx vsce login <publisher-name>
npx vsce publish
```

:::tip
Add `publisher` and `repository` to your `unextension.config.ts` so they are included in the generated `package.json`:

```ts
export default defineConfig({
  // ...
  repository: 'https://github.com/your-user/your-repo',
})
```

:::
