---
inclusion: manual
---

# Commit Summary

After every `git commit` and `git push`, output a summary to the user in the following format:

## Format

```
### Commit Summary

**Branch:** `<branch-name>`
**Commit:** `<commit-message>`
**Files changed:** <count>

#### What was done
- <bullet point summary of changes>

#### Pre-commit checks
- [x] `pnpm -r build` — all packages compile
- [x] `pnpm -r --filter=!@unextension/showcase-e2e test` — all tests pass
- [x] `pnpm run lint:fix` — no lint errors
- [x] `pnpm run format` — formatted with prettier
```

## Rules

- Use `[x]` for checks that were run and passed
- Use `[ ]` for checks that were skipped (with a note why)
- Use `[!]` for checks that failed but were resolved
- Always list all four checks even if some were skipped
- The "What was done" section should be concise (3-6 bullet points max)
- Include the remote URL or PR link if a push was made
