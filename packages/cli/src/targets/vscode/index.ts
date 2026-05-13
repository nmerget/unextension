import path from 'node:path'
import fs from 'fs-extra'
import type { UnextensionConfig } from '../../config.js'
import { defaultIconSvg } from '../shared.js'
import { generateExtensionJs } from './extension.js'

const DEFAULT_ENGINE_VERSION = '>=1.85.0'
const DEFAULT_TYPES_VSCODE_VERSION = '1.85.0'
const DEFAULT_VSCE_VERSION = '3.0.0'

export async function buildVSCode(config: UnextensionConfig, cwd: string) {
  const distDir = path.resolve(cwd, config.distDir || './dist')
  const outDir = path.resolve(cwd, 'output/vscode')

  if (!(await fs.pathExists(distDir))) {
    throw new Error(`distDir not found: ${distDir}\nRun your app's build first.`)
  }

  const vc = config.vscode ?? {}
  const engineVersion = vc.engineVersion ?? DEFAULT_ENGINE_VERSION
  const typesVscodeVersion = vc.typesVscodeVersion ?? DEFAULT_TYPES_VSCODE_VERSION
  const vsceVersion = vc.vsceVersion ?? DEFAULT_VSCE_VERSION

  await fs.ensureDir(outDir)
  await fs.copy(distDir, path.join(outDir, 'webview'))

  if (config.scriptsDir) {
    const scriptsDir = path.resolve(cwd, config.scriptsDir)
    if (await fs.pathExists(scriptsDir)) {
      await fs.copy(scriptsDir, path.join(outDir, 'scripts'))
    }
  }

  const license = config.license || 'MIT'
  const views = config.views ?? []
  const sidebarViews = views.filter((v) => (v.location ?? 'sidebar') === 'sidebar')
  const panelViews = views.filter((v) => v.location === 'panel' || v.location === 'editor')

  // Icons
  const iconsDir = path.join(outDir, 'icons')
  await fs.ensureDir(iconsDir)
  for (const view of views) {
    const iconDest = path.join(iconsDir, `${view.id}.svg`)
    if (view.icon) {
      const iconSrc = path.resolve(cwd, view.icon)
      if (await fs.pathExists(iconSrc)) {
        await fs.copy(iconSrc, iconDest)
        continue
      }
    }
    await fs.writeFile(iconDest, defaultIconSvg(view.title))
  }

  // contributes
  const commands: object[] = [
    { command: `${config.name}.open`, title: `Open ${config.displayName}` },
  ]
  const viewsContainers: { activitybar?: object[] } = {}
  const viewsContrib: Record<string, object[]> = {}
  const activationEvents: string[] = [`onCommand:${config.name}.open`]

  if (sidebarViews.length > 0) {
    viewsContainers.activitybar = sidebarViews.map((v) => ({
      id: `${config.name}-${v.id}`,
      title: v.title,
      icon: `icons/${v.id}.svg`,
    }))
    for (const v of sidebarViews) {
      viewsContrib[`${config.name}-${v.id}`] = [
        { id: `${config.name}.view.${v.id}`, name: v.title, type: 'webview' },
      ]
      activationEvents.push(`onView:${config.name}.view.${v.id}`)
    }
  }

  for (const v of panelViews) {
    commands.push({ command: `${config.name}.open.${v.id}`, title: `Open ${v.title}` })
    activationEvents.push(`onCommand:${config.name}.open.${v.id}`)
  }

  const contributes: Record<string, unknown> = { commands }
  if (Object.keys(viewsContrib).length > 0) {
    contributes.viewsContainers = viewsContainers
    contributes.views = viewsContrib
  }

  const packageJson: Record<string, unknown> = {
    name: config.name,
    displayName: config.displayName,
    version: config.version,
    publisher: config.publisher ?? 'unextension',
    description: config.description || '',
    license,
    engines: { vscode: engineVersion },
    main: './extension.js',
    contributes,
    activationEvents: [...new Set(activationEvents)],
    scripts: { build: 'vsce package --no-dependencies --allow-missing-repository' },
    devDependencies: { '@types/vscode': typesVscodeVersion, '@vscode/vsce': vsceVersion },
  }
  if (config.repository) packageJson.repository = { type: 'git', url: config.repository }

  await fs.writeJson(path.join(outDir, 'package.json'), packageJson, { spaces: 2 })

  const year = new Date().getFullYear()
  const licenseText =
    license === 'MIT'
      ? `MIT License\n\nCopyright (c) ${year}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n`
      : `${license} License\n\nCopyright (c) ${year}\n`
  await fs.writeFile(path.join(outDir, 'LICENSE'), licenseText)
  await fs.writeFile(
    path.join(outDir, '.vscodeignore'),
    `node_modules\n.vscode\n*.vsix\n**/*.map\n**/*.ts\n!extension.js\n`,
  )
  await fs.writeFile(path.join(outDir, 'extension.js'), generateExtensionJs(config, views))

  console.log(`  ✓ VS Code extension → output/vscode/`)
}
