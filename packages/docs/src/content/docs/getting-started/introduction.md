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
│         Next.js / TanStack Start / etc.     │
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

## Packages

| Package | Description |
|---------|-------------|
| `unextension` | CLI — `npx unextension sync` / `build` |
| `@unextension/bridge` | Runtime bridge API for your web app |

