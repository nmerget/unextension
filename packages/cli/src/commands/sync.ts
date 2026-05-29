import { loadConfig } from '../loader.js'
import { validateSettings } from '../validation.js'
import { buildVSCode } from '../targets/vscode/index.js'
import { buildJetBrains } from '../targets/jetbrains/index.js'

export async function sync(cwd: string) {
  const config = await loadConfig(cwd)
  const targets = config.targets || ['vscode', 'jetbrains']

  console.log(`\n⚡ unextension sync — ${config.displayName} v${config.version}\n`)

  if (config.settings && config.settings.length > 0) {
    const errors = validateSettings(config.settings)
    if (errors.length > 0) {
      console.log('  ❌ Settings validation failed:\n')
      for (const error of errors) {
        console.log(`     • ${error.path}: ${error.message}`)
      }
      console.log('')
      process.exit(1)
    }
  }

  if (targets.includes('vscode')) {
    await buildVSCode(config, cwd)
  }

  if (targets.includes('jetbrains')) {
    await buildJetBrains(config, cwd)
  }

  console.log(`\n✅ Done.\n`)
}
