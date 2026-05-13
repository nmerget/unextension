import type { UnextensionConfig, ViewConfig } from '../../config.js'
import { toPascalCase } from '../shared.js'
import { generateActions } from './actions.js'

export function generateExtensionJs(config: UnextensionConfig, views: ViewConfig[]): string {
  const sidebarViews = views.filter((v) => (v.location ?? 'sidebar') === 'sidebar')
  const panelViews = views.filter((v) => v.location === 'panel' || v.location === 'editor')

  const viewProviders = sidebarViews.map((v) => generateViewProvider(config, v)).join('\n\n')

  const sidebarRegistrations = sidebarViews
    .map(
      (v) =>
        `  context.subscriptions.push(\n    vscode.window.registerWebviewViewProvider('${config.name}.view.${v.id}', new ${toPascalCase(v.id)}ViewProvider(context))\n  );`,
    )
    .join('\n')

  const panelRegistrations = panelViews
    .map((v) => {
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
    })
    .join('\n')

  return `const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const os = require('os');

let output;
let outputs = {};
let extensionPath = '';

${viewProviders}

${generateActions()}

function activate(context) {
  output = vscode.window.createOutputChannel('${config.displayName}');
  output.appendLine('${config.displayName} activated');
  context.subscriptions.push(output);
  extensionPath = context.extensionPath;
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
