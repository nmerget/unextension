# AGENTS.md — Rules & Guidelines for AI Agents

This file defines the rules and conventions that AI agents (and human contributors) must follow when working in this repository.

---

## Repository Overview

**unextension** is a monorepo that lets developers build IDE extensions as web apps and deploy them to VS Code and JetBrains from a single codebase.

```
packages/
  cli/          → @unextension/cli — CLI tool (unextension init / sync / build)
  bridge/       → @unextension/bridge — Runtime bridge API for web apps
  showcase/     → Demo app built with TanStack Start
  docs/         → Astro + Starlight documentation site
```

---

## Package Manager

Always use **pnpm**. Never use `npm install` or `yarn` at the repo root or in workspace packages.

```bash
pnpm install          # install all dependencies
pnpm -r build         # build all packages
pnpm --filter @unextension/cli build  # build a single package
```

---

## General Rules

- All new code must be written in **TypeScript**
- Frontend code uses **React**
- All packages use **ESM** (`"type": "module"`)
- Follow [Conventional Commits](https://www.conventionalcommits.org/): `feat(cli): ...`, `fix(bridge): ...`, `docs: ...`
- After editing any package, **rebuild it** with `pnpm run build` inside the package directory
- After changing `packages/cli`, always run `pnpm run build` in `packages/cli` before testing

---

## Documentation Rules

The docs live in `packages/docs/src/content/docs/`. The sidebar is configured in `packages/docs/astro.config.mjs`.

### When you change `packages/bridge/src/`

You **must** update the corresponding docs:

| Changed | Update |
|---------|--------|
| Any exported function or type | `packages/docs/src/content/docs/bridge/` |
| `bridge.postMessage` / `bridge.onMessage` | `packages/docs/src/content/docs/bridge/messaging.md` |
| TypeScript types (`Bridge`, `MessageHandler`) | `packages/docs/src/content/docs/bridge/types.md` |
| New feature added to bridge | Create a new page in `packages/docs/src/content/docs/bridge/` and add it to the sidebar in `astro.config.mjs` |

### When you change `packages/cli/src/config.ts`

You **must** update:

- `packages/docs/src/content/docs/configuration/config-file.md` — update the options table and example
- If a new top-level option is added, document it under `## Options`
- If a new nested config interface is added (e.g. `JetBrainsConfig`, `ViewConfig`), document all its fields

### When you change `packages/cli/src/commands/`

You **must** update:

- `packages/docs/src/content/docs/reference/cli.md` — keep every command's description, flags, and behaviour in sync

| File | Command |
|------|---------|
| `commands/init.ts` | `unextension init` |
| `commands/sync.ts` | `unextension sync` |
| `commands/build.ts` | `unextension build` |
| `commands/dev.ts` | `unextension dev` |

### When you change `packages/cli/src/targets/`

You **must** update:

| File | Docs page |
|------|-----------|
| `targets/vscode.ts` | `packages/docs/src/content/docs/targets/vscode.md` |
| `targets/jetbrains.ts` | `packages/docs/src/content/docs/targets/jetbrains.md` |

This includes changes to: generated file structure, build steps, generated `package.json` fields, `plugin.xml` structure, Gradle configuration, view/toolwindow registration.

### When you add a new sidebar entry

Always update `packages/docs/astro.config.mjs` to include the new page in the correct sidebar group.

---

## Showcase Rules

`packages/showcase` is the demo app. It must always reflect current features.

- Every route used in `unextension.config.ts` `views[].route` must exist as a file in `packages/showcase/src/routes/`
- When a new CLI feature is added, add a demo of it to the showcase if possible
- The showcase config (`packages/showcase/unextension.config.ts`) imports from `@unextension/cli`

---

## CLI Package Rules

- Commands live in `packages/cli/src/commands/` — one file per command
- Target generators live in `packages/cli/src/targets/` — one file per target
- All config types are defined in `packages/cli/src/config.ts` — this is the single source of truth
- The public API (exported from `packages/cli/src/index.ts`) must export `defineConfig` and all config types so consumers get type safety in their `unextension.config.ts`
- After any change to `packages/cli/src/`, rebuild with `pnpm run build`

---

## Bridge Package Rules

- `packages/bridge/src/index.ts` is the single source of truth for the runtime API
- The bridge must remain side-effect free at import time (no DOM access at module load)
- All exports must be typed — no `any` in the public API
- The `bridge` singleton is created once via `createBridge()` and exported

---

## Docs Rules

- Docs are built with **Astro + Starlight** in `packages/docs`
- All content lives in `packages/docs/src/content/docs/`
- Sidebar structure is defined in `packages/docs/astro.config.mjs`
- Code examples in docs must use `@unextension/cli` (not `unextension`) for config imports
- Code examples must use `@unextension/bridge` for bridge imports
- When adding a new docs page, always add it to the sidebar

---

## Change Impact Map

Use this as a quick reference when making changes:

| You change… | Also update… |
|-------------|-------------|
| `packages/bridge/src/index.ts` | `packages/docs/src/content/docs/bridge/` |
| `packages/cli/src/config.ts` | `packages/docs/src/content/docs/configuration/config-file.md` |
| `packages/cli/src/commands/init.ts` | `packages/docs/src/content/docs/reference/cli.md` |
| `packages/cli/src/commands/sync.ts` | `packages/docs/src/content/docs/reference/cli.md` |
| `packages/cli/src/commands/build.ts` | `packages/docs/src/content/docs/reference/cli.md` |
| `packages/cli/src/targets/vscode.ts` | `packages/docs/src/content/docs/targets/vscode.md` |
| `packages/cli/src/targets/jetbrains.ts` | `packages/docs/src/content/docs/targets/jetbrains.md` |
| `packages/docs/astro.config.mjs` sidebar | All referenced slug files must exist |
| `packages/showcase/unextension.config.ts` views | `packages/showcase/src/routes/` (each route must exist) |

