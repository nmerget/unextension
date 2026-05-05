---
title: CLI Commands
description: Reference for all unextension CLI commands.
---

## `unextension init`

Initializes unextension in your project.

- Creates `unextension.config.ts` (or `.js` if no `tsconfig.json` is found), pre-filled from your `package.json`
- Adds `@types/vscode` to `devDependencies` in `package.json`
- Skips if a config file already exists

```bash
npx unextension init [--cwd <dir>]
```

## `unextension sync`

Generates or updates the extension scaffolding in `output/vscode/` and `output/jetbrains/` from your built web app.

Must be run after building your web app (i.e. after `vite build` or equivalent).

```bash
npx unextension sync [--cwd <dir>]
```

## `unextension dev`

Syncs the extension scaffold and launches the IDE(s) with your extension loaded for development.

```bash
# Launch all configured targets
npx unextension dev

# Launch only VS Code
npx unextension dev vscode

# Launch only JetBrains
npx unextension dev jetbrains

npx unextension dev [targets...] [--cwd <dir>]
```

| Target | What it does |
|--------|-------------|
| `vscode` | Runs `unextension sync` then launches VS Code in Extension Development Host mode with `--extensionDevelopmentPath` pointing to `output/vscode/` |
| `jetbrains` | Runs `unextension sync` then runs `gradlew runIde` in `output/jetbrains/` — downloads and launches a sandboxed IDE with the plugin installed |

### Updating after source changes

`unextension dev vscode` syncs once and launches VS Code. After making changes to your web app:

1. Rebuild your web app: `vite build`
2. Re-run `unextension dev vscode` (or just `unextension sync`)
3. In VS Code: `Ctrl+Shift+P` → **Developer: Reload Window**

:::tip
VS Code's Extension Development Host reloads the extension when you reload the window — no need to reinstall or repackage during development.
:::



Runs the native build for one or both targets.

```bash
# Build all configured targets
npx unextension build

# Build a specific target
npx unextension build vscode
npx unextension build jetbrains

npx unextension build [targets...] [--cwd <dir>]
```

| Target | What it runs |
|--------|-------------|
| `vscode` | `npm install` + `vsce package` in `output/vscode/` |
| `jetbrains` | `gradlew build` in `output/jetbrains/` |

