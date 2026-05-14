import path from 'node:path'
import fs from 'fs-extra'

export async function init(cwd: string) {
  const pkgPath = path.join(cwd, 'package.json')
  const hasTsConfig = await fs.pathExists(path.join(cwd, 'tsconfig.json'))

  // Read name/version/description from package.json if available
  let name = path.basename(cwd)
  let version = '0.0.1'
  let description = ''
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath)
    if (pkg.name) name = pkg.name.replace(/^@[^/]+\//, '') // strip scope
    if (pkg.version) version = pkg.version
    if (pkg.description) description = pkg.description
  }

  const configFile = hasTsConfig ? 'unextension.config.ts' : 'unextension.config.js'
  const configPath = path.join(cwd, configFile)

  if (await fs.pathExists(configPath)) {
    console.log(`\n⚠️  ${configFile} already exists, skipping.\n`)
    return
  }

  const configContent = hasTsConfig
    ? `import { defineConfig } from 'unextension'\n\nexport default defineConfig({\n  name: '${name}',\n  displayName: '${toDisplayName(name)}',\n  version: '${version}',\n  description: '${description}',\n  distDir: './dist',\n  targets: ['vscode', 'jetbrains'],\n})\n`
    : `import { defineConfig } from 'unextension'\n\nexport default defineConfig({\n  name: '${name}',\n  displayName: '${toDisplayName(name)}',\n  version: '${version}',\n  description: '${description}',\n  distDir: './dist',\n  targets: ['vscode', 'jetbrains'],\n})\n`

  await fs.writeFile(configPath, configContent)
  console.log(`\n⚡ unextension init\n`)
  console.log(`  ✓ Created ${configFile}`)

  // Add @types/vscode to devDependencies if not present
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath)
    const devDeps = pkg.devDependencies || {}
    let changed = false

    if (!devDeps['@types/vscode']) {
      devDeps['@types/vscode'] = '^1.85.0'
      changed = true
    }

    if (changed) {
      pkg.devDependencies = devDeps
      await fs.writeJson(pkgPath, pkg, { spaces: 2 })
      console.log(`  ✓ Added @types/vscode to devDependencies in package.json`)
      console.log(`\n  Run your package manager install to install new dependencies.\n`)
    }
  }

  console.log()
}

function toDisplayName(name: string): string {
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
