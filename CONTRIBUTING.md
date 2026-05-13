# Contributing to unextension

Thank you for your interest in contributing! This document covers everything you need to get started.

## Repository

https://github.com/nmerget/unextension

## Setup

```bash
git clone https://github.com/nmerget/unextension.git
cd unextension
pnpm install
pnpm build
```

## Project Structure

```
packages/
  cli/              → @unextension/cli — CLI tool (unextension sync / build / dev)
  bridge/           → @unextension/bridge — Runtime bridge API for web apps
  showcase/         → Demo extension built with Vite + React
  showcase-e2e/     → Playwright E2E tests for the showcase extension
  docs/             → Astro + Starlight documentation site
```

## Development

```bash
# Build all packages
pnpm build

# Build a single package
pnpm --filter @unextension/cli build

# Run the showcase in dev mode
pnpm --filter @unextension/showcase dev

# Launch the showcase in VS Code extension development host
pnpm --filter @unextension/showcase dev:vscode

# Launch the showcase in a JetBrains IDE
pnpm --filter @unextension/showcase dev:jetbrains
```

## Unit Tests

Unit tests live in `src/__tests__/` inside each package and run with [Vitest](https://vitest.dev/).

```bash
# Run all unit tests
pnpm test

# Run tests for a single package
pnpm --filter @unextension/bridge test
pnpm --filter @unextension/cli test

# Watch mode
pnpm --filter @unextension/bridge exec vitest
```

### What is tested

| Package               | Tests                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| `@unextension/bridge` | `bridge` core (postMessage, onMessage, request/reply, routing), `createScript` helper |
| `@unextension/cli`    | `toPascalCase`, `escapeXml`, icon SVG helpers, `defineConfig`                         |

## E2E Tests

E2E tests use [Playwright](https://playwright.dev/) and [`@vscode/test-web`](https://github.com/microsoft/vscode-test-web) to launch VS Code in a headless Chromium browser with the showcase extension loaded.

### Prerequisites

The showcase must be built before running E2E tests:

```bash
pnpm --filter @unextension/showcase build
```

### Install Playwright browsers

```bash
pnpm --filter @unextension/showcase-e2e exec playwright install chromium --with-deps
```

### Run E2E tests

```bash
# Run all E2E tests (headless)
pnpm test:e2e

# Run with Playwright UI (interactive)
pnpm --filter @unextension/showcase-e2e test:ui
```

### E2E structure

```
packages/showcase-e2e/
  playwright.config.ts   → Playwright config, starts VS Code via @vscode/test-web
  tests/
    helpers.ts           → Utilities: waitForVSCode, openView, getWebviewFrame
    showcase.test.ts     → Tests: VS Code loads, webview renders, bridge works
```

### How it works

1. `@vscode/test-web` starts VS Code in headless Chromium on `localhost:3000` with the built showcase extension loaded
2. Playwright connects to that browser and drives it
3. Tests open views via the activity bar, find the webview iframe, and assert on its content

### Writing new E2E tests

```ts
import { test, expect } from '@playwright/test'
import { waitForVSCode, openView, getWebviewFrame } from './helpers.js'

test('my feature works', async ({ page }) => {
  await page.goto('/')
  await waitForVSCode(page)
  await openView(page, 'Showcase Explorer')

  const webview = getWebviewFrame(page, 'unextension-showcase.view.explorer')
  await expect(webview.locator('h1')).toBeVisible()
})
```

## Adding a New Bridge Action

See [AGENTS.md](./AGENTS.md#adding-a-new-bridge-action--full-checklist) for the full checklist. In short:

1. `packages/bridge/src/actions/myAction.ts` — typed bridge wrapper
2. `packages/bridge/src/index.ts` — re-export
3. `packages/cli/src/targets/vscode/actions/my-action.js` — VS Code handler (`// @ts-check`)
4. `packages/cli/src/targets/jetbrains/actions/MyAction.kt` — JetBrains handler
5. `packages/showcase/src/components/KitchenSink.tsx` — test button
6. `packages/showcase-e2e/tests/showcase.test.ts` — E2E test for the action

## Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for versioning.

When your PR includes a user-facing change to `@unextension/cli` or `@unextension/bridge`:

```bash
pnpm changeset
```

Follow the prompts to describe the change and select the affected packages. Commit the generated `.changeset/*.md` file with your PR.

Changes to `showcase` and `docs` do not need a changeset.

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(cli): add scriptsDir config option
fix(bridge): handle missing vscode API gracefully
docs: update actions reference
chore: update dependencies
test(bridge): add createScript tests
```

## CI

GitHub Actions runs on every push and pull request:

| Job           | Runs when                   |
| ------------- | --------------------------- |
| `ci` → Test   | All pushes and PRs          |
| `ci` → Build  | All pushes and PRs          |
| `e2e`         | Push to `main` and PRs only |
| `deploy-docs` | Push to `main` only         |
| `release`     | Push to `main` only         |

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
