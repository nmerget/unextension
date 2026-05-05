import { loadConfig } from '../loader.js'
import { buildVSCode } from '../targets/vscode.js'
import { buildJetBrains } from '../targets/jetbrains.js'

export async function sync(cwd: string) {
  const config = await loadConfig(cwd)
  const targets = config.targets || ['vscode', 'jetbrains']

  console.log(`\n⚡ unextension sync — ${config.displayName} v${config.version}\n`)

  if (targets.includes('vscode')) {
    await buildVSCode(config, cwd)
  }

  if (targets.includes('jetbrains')) {
    await buildJetBrains(config, cwd)
  }

  console.log(`\n✅ Done.\n`)
}
