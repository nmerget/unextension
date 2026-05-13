---
title: Introduction
description: What is unextension and how does it work?
---

**unextension** lets you build IDE extensions as web apps and deploy them to both VS Code and JetBrains with a single codebase.

Think of it like [Capacitor](https://capacitorjs.com/) for mobile — but for IDE extensions.

## How it works

```
┌─────────────────────────────────────────────┐
│         Your Plugin (Web App)               │
│         React / Vue / Svelte SPA / etc.     │
└──────────────────┬──────────────────────────┘
                   │  @unextension/bridge
                   ▼
┌─────────────────────────────────────────────┐
│          Universal Bridge API               │
│   unextension.editor.*                      │
│   unextension.workspace.*                   │
│   unextension.ui.*                          │
└───┬──────────────────────────┬──────────────┘
    │                          │
    ▼                          ▼
┌──────────────┐       ┌────────────────┐
│  VS Code     │       │  JetBrains     │
│  Extension   │       │  Plugin (JCEF) │
└──────────────┘       └────────────────┘
```

## Why a SPA?

IDE extension webviews are embedded iframes — there is no server, no routing layer, and no SSR. A pure SPA (e.g. Vite + React, Vite + Vue, Vite + Svelte) is the natural fit:

- Zero server requirements — the built `dist/` is served directly by the IDE
- Fast cold start — no hydration overhead
- Simple build output — a single `index.html` + assets that `unextension sync` can embed as-is

Server-side frameworks like Next.js or TanStack Start are **not recommended** because their SSR/file-based routing adds complexity that provides no benefit inside a webview.

## Packages

| Package               | Description                            |
| --------------------- | -------------------------------------- |
| `unextension`         | CLI — `npx unextension sync` / `build` |
| `@unextension/bridge` | Runtime bridge API for your web app    |
