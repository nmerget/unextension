import path from 'node:path'
import fs from 'fs-extra'
import type { UnextensionConfig, ViewConfig } from '../config.js'

const DEFAULT_ENGINE_VERSION = '>=1.85.0'
const DEFAULT_TYPES_VSCODE_VERSION = '1.85.0'
const DEFAULT_VSCE_VERSION = '3.0.0'

export async function buildVSCode(config: UnextensionConfig, cwd: string) {
  const distDir = path.resolve(cwd, config.distDir || './dist')
  const outDir = path.resolve(cwd, 'output/vscode')

  if (!await fs.pathExists(distDir)) {
    throw new Error(`distDir not found: ${distDir}\nRun your app's build first.`)
  }

  const vc = config.vscode ?? {}
  const engineVersion = vc.engineVersion ?? DEFAULT_ENGINE_VERSION
  const typesVscodeVersion = vc.typesVscodeVersion ?? DEFAULT_TYPES_VSCODE_VERSION
  const vsceVersion = vc.vsceVersion ?? DEFAULT_VSCE_VERSION

  await fs.ensureDir(outDir)
  await fs.copy(distDir, path.join(outDir, 'webview'))

  const license = config.license || 'MIT'
  const views = config.views ?? []

  // Separate views by location
  const sidebarViews = views.filter(v => (v.location ?? 'sidebar') === 'sidebar')
  const panelViews = views.filter(v => v.location === 'panel' || v.location === 'editor')

  // Copy or generate icons
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

  // Build contributes
  const commands: object[] = []
  const viewsContainers: { activitybar?: object[] } = {}
  const viewsContrib: Record<string, object[]> = {}
  const activationEvents: string[] = []

  commands.push({ command: `${config.name}.open`, title: `Open ${config.displayName}` })
  activationEvents.push(`onCommand:${config.name}.open`)

  if (sidebarViews.length > 0) {
    viewsContainers.activitybar = sidebarViews.map(v => ({
      id: `${config.name}-${v.id}`,
      title: v.title,
      icon: `icons/${v.id}.svg`,
    }))
    for (const v of sidebarViews) {
      const containerId = `${config.name}-${v.id}`
      viewsContrib[containerId] = [{ id: `${config.name}.view.${v.id}`, name: v.title, type: 'webview' }]
      activationEvents.push(`onView:${config.name}.view.${v.id}`)
    }
  }

  if (panelViews.length > 0) {
    for (const v of panelViews) {
      commands.push({ command: `${config.name}.open.${v.id}`, title: `Open ${v.title}` })
      activationEvents.push(`onCommand:${config.name}.open.${v.id}`)
    }
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
    devDependencies: {
      '@types/vscode': typesVscodeVersion,
      '@vscode/vsce': vsceVersion,
    },
  }

  if (config.repository) {
    packageJson.repository = { type: 'git', url: config.repository }
  }

  await fs.writeJson(path.join(outDir, 'package.json'), packageJson, { spaces: 2 })

  const year = new Date().getFullYear()
  const licenseText = license === 'MIT'
    ? `MIT License\n\nCopyright (c) ${year}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n`
    : `${license} License\n\nCopyright (c) ${year}\n`
  await fs.writeFile(path.join(outDir, 'LICENSE'), licenseText)

  await fs.writeFile(path.join(outDir, '.vscodeignore'), `node_modules\n.vscode\n*.vsix\n**/*.map\n**/*.ts\n!extension.js\n`)

  await fs.writeFile(path.join(outDir, 'extension.js'), generateExtensionJs(config, views))
  console.log(`  ✓ VS Code extension → output/vscode/`)
}

function generateExtensionJs(config: UnextensionConfig, views: ViewConfig[]): string {
  const sidebarViews = views.filter(v => (v.location ?? 'sidebar') === 'sidebar')
  const panelViews = views.filter(v => v.location === 'panel' || v.location === 'editor')

  const viewProviders = sidebarViews.map(v => generateViewProvider(config, v)).join('\n\n')

  const sidebarRegistrations = sidebarViews.map(v =>
    `  context.subscriptions.push(\n    vscode.window.registerWebviewViewProvider('${config.name}.view.${v.id}', new ${toPascalCase(v.id)}ViewProvider(context))\n  );`
  ).join('\n')

  const panelRegistrations = panelViews.map(v => {
    const route = v.route.replace(/\/\*$/, '')
    return `  if (!outputs['${v.id}']) outputs['${v.id}'] = vscode.window.createOutputChannel('${v.title}');
  const statusBar${toPascalCase(v.id)} = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  statusBar${toPascalCase(v.id)}.text = '$(layout-panel) ${v.title}';
  statusBar${toPascalCase(v.id)}.command = '${config.name}.open.${v.id}';
  statusBar${toPascalCase(v.id)}.show();
  context.subscriptions.push(statusBar${toPascalCase(v.id)});
  context.subscriptions.push(vscode.commands.registerCommand('${config.name}.open.${v.id}', () => {
    const channel = outputs['${v.id}'];
    const panel = vscode.window.createWebviewPanel(
      '${config.name}.${v.id}',
      '${v.title}',
      vscode.ViewColumn.Beside,
      { enableScripts: true, localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'webview'))] }
    );
    panel.webview.html = loadWebview(context.extensionPath, '${route}');
    panel.webview.onDidReceiveMessage((msg) => handleMessage(msg, panel.webview, channel));
  }));`
  }).join('\n')

  return `const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const os = require('os');

let output;
let outputs = {};

${viewProviders}

function handleMessage(msg, webview, channel) {
  const { type, payload, correlationId } = msg ?? {};
  (channel || output).appendLine('[unextension] message: ' + type + ' ' + JSON.stringify(payload ?? {}));

  function reply(replyPayload) {
    webview.postMessage({ type: type + ':reply', payload: replyPayload, correlationId });
  }

  switch (type) {
    case 'run-command': {
      const command = payload?.command ?? '';
      const isWin = os.platform() === 'win32';
      const [shell, flag] = isWin ? ['cmd', '/c'] : ['sh', '-c'];
      execFile(shell, [flag, command], { timeout: 30000 }, (err, stdout, stderr) => {
        reply({ command, stdout, stderr, exitCode: err?.code ?? 0 });
      });
      break;
    }
    case 'notify': {
      const level = payload?.level ?? 'info';
      const message = payload?.message ?? '';
      if (level === 'error') vscode.window.showErrorMessage(message);
      else if (level === 'warning') vscode.window.showWarningMessage(message);
      else vscode.window.showInformationMessage(message);
      reply({ shown: true });
      break;
    }
    default:
      console.warn('[unextension] unhandled message type:', type);
      reply({ received: true, echo: payload });
  }
}

function activate(context) {
  output = vscode.window.createOutputChannel('${config.displayName}');
  output.appendLine('${config.displayName} activated');
  context.subscriptions.push(output);
  context.subscriptions.push(vscode.commands.registerCommand('${config.name}.open', () => {
    const panel = vscode.window.createWebviewPanel(
      '${config.name}',
      '${config.displayName}',
      vscode.ViewColumn.One,
      { enableScripts: true, localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'webview'))] }
    );
    panel.webview.html = loadWebview(context.extensionPath, '/');
    panel.webview.onDidReceiveMessage((msg) => handleMessage(msg, panel.webview));
  }));
${sidebarRegistrations ? '\n' + sidebarRegistrations : ''}
${panelRegistrations ? '\n' + panelRegistrations : ''}
}

function deactivate() {}

function loadWebview(extensionPath, route) {
  const webviewPath = path.join(extensionPath, 'webview', 'index.html');
  if (!fs.existsSync(webviewPath)) {
    return '<h2>unextension: webview not found. Run your app build then unextension sync.</h2>';
  }
  let html = fs.readFileSync(webviewPath, 'utf8');
  const sq = String.fromCharCode(39);
  const csp = '<meta http-equiv="Content-Security-Policy" content="default-src ' + sq + 'none' + sq + '; script-src ' + sq + 'unsafe-inline' + sq + '; style-src ' + sq + 'unsafe-inline' + sq + '; img-src data: blob:; font-src data:;">';
  html = html.replace('<head>', '<head>' + csp);
  html = html.replace('</head>', '<script>window.__UNEXTENSION_ROUTE__=' + JSON.stringify(route) + ';</script></head>');
  return html;
}

module.exports = { activate, deactivate };
`
}

function generateViewProvider(config: UnextensionConfig, view: ViewConfig): string {
  const className = `${toPascalCase(view.id)}ViewProvider`
  const route = view.route.replace(/\/\*$/, '')
  return `class ${className} {
  static viewType = '${config.name}.view.${view.id}';
  constructor(context) { this._context = context; }
  resolveWebviewView(webviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(path.join(this._context.extensionPath, 'webview'))]
    };
    try {
      if (!outputs['${view.id}']) outputs['${view.id}'] = vscode.window.createOutputChannel('${view.title}');
      const channel = outputs['${view.id}'];
      webviewView.webview.html = loadWebview(this._context.extensionPath, '${route}');
      this._context.subscriptions.push(webviewView.webview.onDidReceiveMessage((msg) => handleMessage(msg, webviewView.webview, channel)));
    } catch (err) {
      console.error('[unextension] Failed to load webview for ${config.name}.view.${view.id}:', err);
      webviewView.webview.html = '<h2 style="font-family:sans-serif;color:#c00">unextension error</h2>'
        + '<pre style="font-family:monospace;white-space:pre-wrap">' + (err && err.message ? err.message : String(err)) + '</pre>';
    }
  }
}`
}

function toPascalCase(str: string): string {
  return str.replace(/(^|[-_])([a-z])/g, (_, __, c) => c.toUpperCase())
}

function defaultIconSvg(title: string): string {
  const letter = (title?.[0] ?? '?').toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" font-size="12" fill="currentColor" stroke="none">${letter}</text></svg>`
}
