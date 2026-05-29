---
title: Quick Start
description: Get up and running with unextension in minutes.
---

## 1. Install

```bash
pnpm add -D @unextension/cli @unextension/bridge
```

## 2. Initialize

Run the init command to create a config file and install required dependencies:

```bash
npx unextension init
```

This will create `unextension.config.ts` (or `.js` if no `tsconfig.json` is found) and add `@types/vscode` to your `devDependencies`.

## 3. Configure views (optional)

Add views to your config to register IDE panels. See the [Views](/configuration/views) documentation for details.

## 4. Build your web app

Build your web app to the `distDir` configured (default: `./dist`):

```bash
npm run build
```

## 5. Sync extension scaffolding

Generate the VS Code and JetBrains extension output:

```bash
npx unextension sync
```

This creates `output/vscode/` and `output/jetbrains/` with all necessary files.

## 6. Build the extensions

```bash
# Build both
npx unextension build

# Build only VS Code
npx unextension build vscode

# Build only JetBrains
npx unextension build jetbrains
```
