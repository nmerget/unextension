Follow the rules in AGENTS.md at the repo root.

## Stack

- Monorepo managed with **pnpm workspaces**
- All packages use **TypeScript** and **ESM**
- CLI package: `@unextension/cli` (bin: `unextension`)
- Bridge package: `@unextension/bridge`
- Frontend: **React** (showcase uses TanStack Start)
- Docs: **Astro + Starlight**

## Commands

- Install: `pnpm install`
- Build all: `pnpm -r build`
- Build CLI: `pnpm --filter @unextension/cli build`
- Build bridge: `pnpm --filter @unextension/bridge build`
- Dev showcase: `pnpm --filter @unextension/showcase dev`
- Dev docs: `pnpm --filter @unextension/docs dev`
- Sync showcase: `pnpm --filter @unextension/showcase build`
- Build JetBrains: `pnpm --filter @unextension/showcase build:jetbrains`
- Build VSCode: `pnpm --filter @unextension/showcase build:vscode`

## Key Conventions

- Config imports use `@unextension/cli`, never `unextension`
- Bridge imports use `@unextension/bridge`
- All new code in TypeScript — no plain `.js` files in `packages/`
- After any CLI change, rebuild before testing: `pnpm --filter @unextension/cli build`
- Every view route in `unextension.config.ts` must have a matching file in `packages/showcase/src/routes/`
- When adding a docs page, always add it to the sidebar in `packages/docs/astro.config.mjs`
