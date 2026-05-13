# Changesets

This directory contains changesets for versioning and changelog generation.

## Workflow

1. Make your changes
2. Run `pnpm changeset` to create a changeset describing what changed
3. Commit the changeset file along with your changes
4. When merged to `main`, the CI will open a "Version Packages" PR
5. Merging that PR publishes the packages to npm

Repository: https://github.com/nmerget/unextension

## Packages that are versioned

- `@unextension/cli`
- `@unextension/bridge`

## Packages that are ignored (not published)

- `@unextension/showcase` — demo app
- `@unextension/docs` — documentation site
