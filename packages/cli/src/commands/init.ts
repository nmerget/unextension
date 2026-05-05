import path from 'node:path'
import fs from 'fs-extra'

const LICENSE_FILES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'LICENCE.txt']

export async function init(cwd: string) {
  const pkgPath = path.join(cwd, 'package.json')
  const hasTsConfig = await fs.pathExists(path.join(cwd, 'tsconfig.json'))

  // Read fields from package.json if available
  let name = path.basename(cwd)
  let version = '0.0.1'
  let description = ''
  let repository = ''
  let license = ''

  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath)
    if (pkg.name) name = pkg.name.replace(/^@[^/]+\//, '') // strip scope
    if (pkg.version) version = pkg.version
    if (pkg.description) description = pkg.description
    if (pkg.license) license = pkg.license
    if (pkg.repository) {
      repository = typeof pkg.repository === 'string'
        ? pkg.repository
        : pkg.repository.url ?? ''
    }
  }

  // Detect license file if license not already known
  if (!license) {
    for (const file of LICENSE_FILES) {
      if (await fs.pathExists(path.join(cwd, file))) {
        const content = await fs.readFile(path.join(cwd, file), 'utf8')
        // Best-effort: detect common licenses from file content
        if (/mit license/i.test(content)) license = 'MIT'
        else if (/apache license.*2\.0/i.test(content)) license = 'Apache-2.0'
        else if (/gnu general public license.*v3/i.test(content)) license = 'GPL-3.0'
        else if (/isc license/i.test(content)) license = 'ISC'
        else if (/bsd 2-clause/i.test(content)) license = 'BSD-2-Clause'
        else if (/bsd 3-clause/i.test(content)) license = 'BSD-3-Clause'
        break
      }
    }
  }

  const configFile = hasTsConfig ? 'unextension.config.ts' : 'unextension.config.js'
  const configPath = path.join(cwd, configFile)

  if (await fs.pathExists(configPath)) {
    console.log(`\n⚠️  ${configFile} already exists, skipping.\n`)
    return
  }

  const fields = [
    `  name: ${JSON.stringify(name)}`,
    `  displayName: ${JSON.stringify(toDisplayName(name))}`,
    `  publisher: ${JSON.stringify(name)}`,
    `  version: ${JSON.stringify(version)}`,
    `  description: ${JSON.stringify(description)}`,
    ...(repository ? [`  repository: ${JSON.stringify(repository)}`] : []),
    ...(license ? [`  license: ${JSON.stringify(license)}`] : []),
    `  distDir: './dist'`,
    `  targets: ['vscode', 'jetbrains']`,
  ].join(',\n')

  const configContent = `import { defineConfig } from '@unextension/cli'\n\nexport default defineConfig({\n${fields},\n})\n`

  await fs.writeFile(configPath, configContent)
  console.log(`\n⚡ unextension init\n`)
  console.log(`  ✓ Created ${configFile}`)

  // Add @types/vscode to devDependencies if not present
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath)
    const devDeps = pkg.devDependencies || {}

    if (!devDeps['@types/vscode']) {
      devDeps['@types/vscode'] = '1.85.0'
      pkg.devDependencies = devDeps
      await fs.writeJson(pkgPath, pkg, { spaces: 2 })
      console.log(`  ✓ Added @types/vscode to devDependencies in package.json`)
      console.log(`\n  Run your package manager install to install new dependencies.\n`)
    }
  }

  console.log()
}

function toDisplayName(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
