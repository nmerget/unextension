---
title: Troubleshooting
description: Common issues and solutions when building web apps with @unextension/bridge.
---

## Extensions run inside an iframe

Your web app is loaded inside an **iframe** within the IDE's WebView panel. This has important implications:

- **You cannot open another iframe** inside your extension. Nested iframes are blocked by the WebView's content security policy.
- **External links won't navigate** — clicking an `<a href="...">` tag will not open the URL in the browser.

### Opening URLs

Use the [`openInSimpleBrowser`](./open-in-simple-browser) action to open URLs in the IDE's built-in browser panel:

```ts
import { openInSimpleBrowser } from '@unextension/bridge'

// Opens in the IDE's built-in browser (VS Code) or system browser (JetBrains)
await openInSimpleBrowser('https://example.com')
```

Or use `executeCommand` with the cross-platform command:

```ts
import { executeCommand } from '@unextension/bridge'

await executeCommand('unextension.openInBrowser', ['https://example.com'])
```

---

## Bundling with Vite

Since your web app runs inside an iframe, all assets (JS, CSS, images) must be inlined into a single HTML file. The IDE WebView loads a single `index.html` — it cannot fetch separate chunk files.

### Use `vite-plugin-singlefile`

Install the plugin:

```bash
pnpm add -D vite-plugin-singlefile
```

Configure your `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist',
  },
})
```

This inlines all JavaScript and CSS directly into `index.html`, producing a single self-contained file that the WebView can load.

:::tip
The unextension showcase app already uses `vite-plugin-singlefile` — check `packages/showcase/vite.config.ts` for a working example.
:::

---

## JetBrains only supports `unextension.*` commands

If you call `executeCommand` with a VS Code-specific command (e.g. `workbench.action.openSettings`) in JetBrains, you'll get:

```
Command not supported in JetBrains: workbench.action.openSettings.
Use getTarget() to detect the platform and call native commands conditionally.
```

### Solution

Use the cross-platform `unextension.*` commands instead:

```ts
// ❌ Won't work in JetBrains
await executeCommand('workbench.action.openSettings')

// ✅ Works in both VS Code and JetBrains
await executeCommand('unextension.openSettings')
```

If you need a VS Code-only command, use `getTarget()` to conditionally execute:

```ts
import { executeCommand, getTarget } from '@unextension/bridge'

const { target } = await getTarget()

if (target === 'vscode') {
  await executeCommand('editor.action.formatDocument')
}
```

See [Execute Command — Cross-platform commands](./execute-command#cross-platform-commands) for the full list.

---

## Bridge not connecting

If `bridge.request()` calls hang or never resolve:

1. **Check the WebView is loaded** — the bridge requires `window.acquireVsCodeApi` (VS Code) or `window.__unextension_jb_bridge` (JetBrains) to be available.
2. **Verify the build** — run `unextension sync` after any changes to regenerate the extension output.
3. **Check the console** — open the WebView developer tools (VS Code: `Developer: Open Webview Developer Tools`, JetBrains: right-click → Inspect) to see errors.

---

## Hot reload not working in development

The WebView iframe has its own context separate from your dev server. To get live reload working:

1. Run your Vite dev server (`pnpm dev`)
2. Use `unextension dev` which proxies the WebView to your dev server
3. Changes will hot-reload inside the IDE panel

:::note
`unextension dev` is only supported for VS Code currently. For JetBrains, rebuild and re-sync after changes.
:::
