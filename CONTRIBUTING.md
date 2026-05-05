# Contributing to unextension

## Setup

```bash
pnpm install
pnpm build
```

## Project Structure

```
packages/
  cli/          → `unextension` CLI (npx unextension build)
  bridge/       → `@unextension/bridge` runtime API for web apps
  wrapper-vscode/     → VS Code extension wrapper
  wrapper-jetbrains/  → JetBrains plugin wrapper
```

## Development

```bash
# Build all packages
pnpm build

# Build a single package
pnpm --filter unextension build
```

## Adding a new target

1. Create a new file in `packages/cli/src/targets/`
2. Export a `buildX(config, cwd)` function
3. Wire it up in `packages/cli/src/build.ts`
4. Add the target name to the `targets` type in `packages/cli/src/config.ts`

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(cli): add --watch flag
fix(bridge): handle missing vscode API
chore: update dependencies
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
