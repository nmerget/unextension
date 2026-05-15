// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {null} payload
 * @param {(result: { colorScheme: 'dark' | 'light', colors: Record<string, string> }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {Promise<void>}
 */
async function getTheme(payload, reply, channel) {
  const kind = vscode.window.activeColorTheme.kind
  // ColorThemeKind: Light = 1, Dark = 2, HighContrast = 3, HighContrastLight = 4
  const colorScheme = kind === 1 || kind === 4 ? 'light' : 'dark'

  /** @type {Record<string, string>} */
  const colors = {}

  /** @type {[string, string][]} */
  const colorMap = [
    ['background', 'editor.background'],
    ['foreground', 'editor.foreground'],
    ['inputBackground', 'input.background'],
    ['inputForeground', 'input.foreground'],
    ['border', 'panel.border'],
    ['selectionBackground', 'editor.selectionBackground'],
    ['selectionForeground', 'list.activeSelectionForeground'],
    ['link', 'textLink.foreground'],
    ['buttonBackground', 'button.background'],
    ['buttonForeground', 'button.foreground'],
  ]

  const customizations =
    vscode.workspace.getConfiguration('workbench').get('colorCustomizations') || {}
  for (const [key, tokenId] of colorMap) {
    const value = customizations[tokenId]
    if (value != null) {
      colors[key] = value
    }
  }

  ;(channel || output).appendLine('[unextension] getTheme: ' + colorScheme)
  reply({ colorScheme, colors })
}
