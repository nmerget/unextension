import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { launchVSCode, waitForVSCode, openView, getWebviewFrame } from './helpers.js'

let app: ElectronApplication
let page: Page

test.beforeAll(
  async () => {
    const launched = await launchVSCode()
    app = launched.app
    page = launched.page
    await waitForVSCode(page)
  },
  { timeout: 120_000 },
)

test.afterAll(async () => {
  await app?.close()
})

test.describe('Unextension Showcase', () => {
  test('VS Code loads successfully', async () => {
    await expect(page.locator('.monaco-workbench')).toBeVisible()
  })

  test('Explorer view opens and shows the webview', async () => {
    await openView(page, 'Showcase Explorer')

    // Wait for the webview iframe to appear
    const webview = getWebviewFrame(page, 'unextension-showcase.view.explorer')
    await expect(webview.locator('h1')).toContainText('Unextension Showcase')
  })

  test('JS loads and bridge is ready', async () => {
    await openView(page, 'Showcase Explorer')

    const webview = getWebviewFrame(page, 'unextension-showcase.view.explorer')

    // Wait for the "JS loaded" log entry from the bridge
    await expect(webview.locator('.log div').filter({ hasText: 'JS loaded' })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('Send ping button sends a message and receives a reply', async () => {
    await openView(page, 'Showcase Explorer')

    const webview = getWebviewFrame(page, 'unextension-showcase.view.explorer')
    await webview.locator('button', { hasText: 'postMessage' }).click()

    // The reply should appear in the log
    await expect(webview.locator('.log div').filter({ hasText: 'ping:reply' })).toBeVisible({
      timeout: 10_000,
    })
  })
})
