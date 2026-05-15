---
description: Rules for git commits, pushes, and pre-commit checks (build, test, lint, format)
inclusion: auto
---

# Git Workflow Rules

## Before Committing

Always run the following checks in order before creating a commit:

1. `pnpm -r build` — ensure all packages compile
2. `pnpm -r --filter=!@unextension/showcase-e2e test` — ensure all tests pass
3. `pnpm run lint:fix` — fix lint issues automatically
4. `pnpm run format` — format all files with prettier

If any step fails, fix the issue before proceeding.

## Committing and Pushing

- **Always ask the user for confirmation before running `git commit` or `git push`.**
- Never commit or push without explicit user approval.
- Pin all new dependencies to exact versions (no `^` or `~` prefixes).
- Use conventional commit messages: `feat(scope):`, `fix(scope):`, `chore:`, etc.
- Push to a new branch, never directly to main.
