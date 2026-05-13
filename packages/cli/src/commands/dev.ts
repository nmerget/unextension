import path from 'node:path'
import os from 'node:os'
import fs from 'fs-extra'
import { spawnSync, spawn } from 'node:child_process'
import { loadConfig } from '../loader.js'

export async function dev(cwd: string, targets?: string[]) {
  const config = await loadConfig(cwd)
  const resolvedTargets = targets?.length ? targets : (config.targets ?? ['vscode', 'jetbrains'])

  console.log(`\n⚡ unextension dev — ${config.displayName} v${config.version}\n`)

  // Always sync first so output is up to date
  console.log('  🔄 Syncing extension scaffold...')
  // Pass devMode so generated Kotlin opens DevTools
  const devConfig = { ...config, jetbrains: { ...config.jetbrains, _devMode: true } }
  const { buildVSCode } = await import('../targets/vscode/index.js')
  const { buildJetBrains } = await import('../targets/jetbrains/index.js')
  if (resolvedTargets.includes('vscode')) await buildVSCode(devConfig, cwd)
  if (resolvedTargets.includes('jetbrains')) await buildJetBrains(devConfig, cwd)

  if (resolvedTargets.includes('jetbrains')) {
    await devJetBrains(cwd)
  }

  if (resolvedTargets.includes('vscode')) {
    await devVSCode(cwd)
  }
}

async function devJetBrains(cwd: string) {
  const outDir = path.resolve(cwd, 'output/jetbrains')
  const isWin = os.platform() === 'win32'
  const gradlew = path.join(outDir, isWin ? 'gradlew.bat' : 'gradlew')

  if (!(await fs.pathExists(gradlew))) {
    throw new Error(`Gradle wrapper not found at ${gradlew}\nRun "unextension sync" first.`)
  }

  console.log('  🚀 Launching JetBrains IDE with plugin (runIde)...')
  console.log('     This will download the IDE on first run — please be patient.\n')

  const result = spawnSync(gradlew, ['runIde'], {
    cwd: outDir,
    stdio: 'inherit',
    shell: isWin,
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

async function devVSCode(cwd: string) {
  const outDir = path.resolve(cwd, 'output/vscode')
  const isWin = os.platform() === 'win32'
  const npm = isWin ? 'npm.cmd' : 'npm'

  if (!(await fs.pathExists(outDir))) {
    throw new Error(`VS Code output not found at ${outDir}\nRun "unextension sync" first.`)
  }

  // Install deps if needed
  const nodeModules = path.join(outDir, 'node_modules')
  if (!(await fs.pathExists(nodeModules))) {
    console.log('  📦 Installing VS Code extension dependencies...')
    const install = spawnSync(npm, ['install'], {
      cwd: outDir,
      stdio: 'inherit',
      shell: isWin,
    })
    if (install.error) throw install.error
    if (install.status !== 0) process.exit(install.status ?? 1)
  }

  // Find the VS Code executable
  const code = resolveCodeExecutable()
  if (!code) {
    console.log('  ⚠️  Could not find VS Code executable (code/code-insiders).')
    console.log('     Install manually: Extensions panel → ··· → Install from VSIX')
    console.log(`     Extension folder: ${outDir}`)
    return
  }

  console.log('  🚀 Launching VS Code Extension Development Host...')

  const proc = spawn(code, ['--extensionDevelopmentPath', outDir], {
    stdio: 'inherit',
    shell: isWin,
    detached: true,
  })
  proc.unref()

  console.log('  ✓ VS Code launched with extension loaded')
}

function resolveCodeExecutable(): string | null {
  const isWin = os.platform() === 'win32'
  const candidates = isWin
    ? [
        'code.cmd',
        'code-insiders.cmd',
        path.join(
          process.env['LOCALAPPDATA'] ?? '',
          'Programs',
          'Microsoft VS Code',
          'bin',
          'code.cmd',
        ),
        path.join(
          process.env['LOCALAPPDATA'] ?? '',
          'Programs',
          'Microsoft VS Code Insiders',
          'bin',
          'code-insiders.cmd',
        ),
      ]
    : [
        'code',
        'code-insiders',
        '/usr/local/bin/code',
        '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
        '/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders',
      ]

  for (const candidate of candidates) {
    const probe = spawnSync(
      isWin ? 'where' : 'which',
      [candidate.includes(path.sep) ? path.basename(candidate) : candidate],
      {
        encoding: 'utf8',
        shell: isWin,
      },
    )
    if (probe.status === 0 && probe.stdout.trim()) return candidate
    // For absolute paths, check existence directly
    if (candidate.includes(path.sep) && fs.existsSync(candidate)) return candidate
  }
  return null
}
