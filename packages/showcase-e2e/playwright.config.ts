import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  workers: 1, // VS Code tests must run serially

  use: {
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },

  // Allow extra time for VS Code download + startup in CI
  globalTimeout: process.env['CI'] ? 600_000 : undefined,
})
