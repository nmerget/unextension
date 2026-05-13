import {
  _electron as electron,
  type ElectronApplication,
  type Page,
  type FrameLocator,
} from 'playwright'
import { downloadAndUnzipVSCode } from '@vscode/test-electron'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const extensionPath = join(root, '../showcase/output/vscode')

/**
 * Resolves the VS Code Electron executable path.
 * Priority: VSCODE_PATH env var > local install > download via @vscode/test-electron
 */
async function resolveVSCodePath(): Promise<string> {
  if (process.env['VSCODE_PATH']) {
    return process.env['VSCODE_PATH']
  }

  // Check standard local install locations
  const candidates =
    process.platform === 'win32'
      ? [
          join(process.env['LOCALAPPDATA'] ?? '', 'Programs', 'Microsoft VS Code', 'Code.exe'),
          join(process.env['PROGRAMFILES'] ?? '', 'Microsoft VS Code', 'Code.exe'),
        ]
      : process.platform === 'darwin'
        ? ['/Applications/Visual Studio Code.app/Contents/MacOS/Electron']
        : ['/usr/share/code/code', '/usr/bin/code']

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  // Fallback: download VS Code (used in CI)
  return await downloadAndUnzipVSCode('stable')
}

/**
 * Launches VS Code via Playwright Electron with the showcase extension loaded.
 * Returns the ElectronApplication and the main window Page.
 */
export async function launchVSCode(): Promise<{ app: ElectronApplication; page: Page }> {
  const vscodePath = await resolveVSCodePath()

  // Create a fresh user-data-dir so tests don't interfere with each other
  const userDataDir = mkdtempSync(join(tmpdir(), 'vscode-e2e-'))

  const app = await electron.launch({
    executablePath: vscodePath,
    args: [
      `--extensionDevelopmentPath=${extensionPath}`,
      `--user-data-dir=${userDataDir}`,
      '--disable-extensions', // disable all other extensions (ours is loaded via extensionDevelopmentPath)
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-workspace-trust',
      '--new-window',
      join(root, '../showcase'), // open the showcase folder as workspace
    ],
    env: {
      ...process.env,
      DONT_PROMPT_WSL_INSTALL: '1',
    },
  })

  const page = await app.firstWindow()
  return { app, page }
}

/**
 * Waits for VS Code to finish loading.
 */
export async function waitForVSCode(page: Page): Promise<void> {
  await page.waitForSelector('.monaco-workbench', { timeout: 30_000 })
}

/**
 * Opens a view by its title in the activity bar.
 */
export async function openView(page: Page, title: string): Promise<void> {
  // In desktop VS Code, activity bar items have aria-label on the inner <a> element
  const activityItem = page.locator(`.activitybar [role="tab"] a[aria-label*="${title}"]`).first()
  await activityItem.click()
}

/**
 * Returns the FrameLocator for a webview with the given view type.
 * VS Code desktop wraps webviews in nested iframes.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getWebviewFrame(page: Page, viewId: string): FrameLocator {
  // Desktop VS Code uses nested iframes for webviews:
  // 1. Outer iframe with class 'webview ready'
  // 2. Inner iframe with id 'active-frame' (there's also a 'pending-frame' we must skip)
  return page.frameLocator('iframe.webview.ready').frameLocator('#active-frame')
}
