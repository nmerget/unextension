import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { loadConfig } from './loader.js'

export async function build(cwd: string, targets?: string[]) {
  const config = await loadConfig(cwd)
  const resolvedTargets = targets?.length ? targets : (config.targets ?? ['vscode', 'jetbrains'])

  console.log(`\n⚡ unextension build — ${config.displayName} v${config.version}\n`)

  if (resolvedTargets.includes('jetbrains')) {
    buildJetBrains(cwd)
  }

  if (resolvedTargets.includes('vscode')) {
    buildVSCode(cwd)
  }

  console.log(`\n✅ Done.\n`)
}

function buildJetBrains(cwd: string) {
  const outDir = path.resolve(cwd, 'output/jetbrains')
  const isWin = os.platform() === 'win32'
  const gradlew = path.join(outDir, isWin ? 'gradlew.bat' : 'gradlew')

  console.log('  🔨 Building JetBrains plugin...')
  const result = spawnSync(gradlew, ['build'], {
    cwd: outDir,
    stdio: 'inherit',
    shell: isWin,
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  console.log('  ✓ JetBrains plugin built')
}

function buildVSCode(cwd: string) {
  const outDir = path.resolve(cwd, 'output/vscode')
  const isWin = os.platform() === 'win32'
  const npm = isWin ? 'npm.cmd' : 'npm'

  console.log('  🔨 Building VS Code extension...')
  const result = spawnSync(npm, ['run', 'build'], {
    cwd: outDir,
    stdio: 'inherit',
    shell: isWin,
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  console.log('  ✓ VS Code extension built')
}
