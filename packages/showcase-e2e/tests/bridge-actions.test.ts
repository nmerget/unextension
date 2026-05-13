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
    await openView(page, 'Showcase Explorer')
  },
  { timeout: 120_000 },
)

test.afterAll(async () => {
  await app?.close()
})

test.describe('Bridge Actions', () => {
  test('notify action delivers notification', async () => {
    const webview = getWebviewFrame(page, 'unextension-showcase.view.explorer')
    await webview.locator('button', { hasText: 'notify' }).click()
    await expect(
      webview.locator('.log div').filter({ hasText: '🔔 notify → info sent' }),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('readProjectFile action reads file content', async () => {
    const webview = getWebviewFrame(page, 'unextension-showcase.view.explorer')
    await webview.locator('button', { hasText: 'readProjectFile' }).click()
    const logEntry = webview.locator('.log div').filter({ hasText: '📄 readProjectFile' })
    await expect(logEntry.filter({ hasText: 'chars' })).toBeVisible({ timeout: 10_000 })
    await expect(logEntry.filter({ hasText: '❌' })).not.toBeVisible()
  })

  test('writeProjectFile action writes file content', async () => {
    const webview = getWebviewFrame(page, 'unextension-showcase.view.explorer')
    await webview.locator('button', { hasText: 'writeProjectFile' }).click()
    await expect(
      webview.locator('.log div').filter({ hasText: '✏️ writeProjectFile → success: true' }),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('runCommand action executes shell command', async () => {
    const webview = getWebviewFrame(page, 'unextension-showcase.view.explorer')
    await webview.locator('button', { hasText: 'runCommand' }).click()
    await expect(
      webview
        .locator('.log div')
        .filter({ hasText: '✅ runCommand → exit 0: hello from unextension' }),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('listProjectFiles action returns file listing', async () => {
    const webview = getWebviewFrame(page, 'unextension-showcase.view.explorer')
    await webview.locator('button', { hasText: 'listProjectFiles' }).click()
    const logEntry = webview.locator('.log div').filter({ hasText: '📁 listProjectFiles' })
    await expect(logEntry.filter({ hasText: 'file(s)' })).toBeVisible({ timeout: 10_000 })
    await expect(logEntry.filter({ hasText: '❌' })).not.toBeVisible()
  })

  test('runScript action executes named script', async () => {
    const webview = getWebviewFrame(page, 'unextension-showcase.view.explorer')
    await webview.locator('button', { hasText: 'runScript' }).click()
    await expect(
      webview.locator('.log div').filter({ hasText: '🚀 runScript → exit' }),
    ).toBeVisible({ timeout: 10_000 })
  })
})
