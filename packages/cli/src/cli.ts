#!/usr/bin/env node
import cac from 'cac'
import { sync } from './commands/sync.js'
import { build } from './commands/build.js'
import { init } from './commands/init.js'
import { dev } from './commands/dev.js'

const cli = cac('unextension')

cli
  .command('init', 'Initialize unextension config and install required dependencies')
  .option('--cwd <dir>', 'Working directory', { default: process.cwd() })
  .action(async (options: { cwd: string }) => {
    await init(options.cwd)
  })

cli
  .command('sync', 'Create/update IDE extension scaffolding from your web app')
  .option('--cwd <dir>', 'Working directory', { default: process.cwd() })
  .action(async (options: { cwd: string }) => {
    await sync(options.cwd)
  })

cli
  .command('build [targets...]', 'Build the native IDE extensions (gradle / vscode)')
  .option('--cwd <dir>', 'Working directory', { default: process.cwd() })
  .action(async (targets: string[], options: { cwd: string }) => {
    await build(options.cwd, targets)
  })

cli
  .command('dev [targets...]', 'Launch IDE(s) with the extension loaded for development')
  .option('--cwd <dir>', 'Working directory', { default: process.cwd() })
  .action(async (targets: string[], options: { cwd: string }) => {
    await dev(options.cwd, targets)
  })

cli.help()
cli.version('0.0.1')
cli.parse()
