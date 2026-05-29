import { describe, it, expect } from 'vitest'
import { defineConfig } from '../config.js'

describe('defineConfig', () => {
  it('returns the config unchanged', () => {
    const config = defineConfig({
      name: 'my-ext',
      displayName: 'My Extension',
      version: '1.0.0',
    })
    expect(config.name).toBe('my-ext')
    expect(config.displayName).toBe('My Extension')
    expect(config.version).toBe('1.0.0')
  })

  it('accepts optional fields', () => {
    const config = defineConfig({
      name: 'my-ext',
      displayName: 'My Extension',
      version: '1.0.0',
      scriptsDir: './scripts',
      targets: ['vscode'],
      views: [{ id: 'main', title: 'Main', route: '/' }],
    })
    expect(config.scriptsDir).toBe('./scripts')
    expect(config.targets).toEqual(['vscode'])
    expect(config.views).toHaveLength(1)
  })

  it('accepts shellPath option', () => {
    const config = defineConfig({
      name: 'my-ext',
      displayName: 'My Extension',
      version: '1.0.0',
      shellPath: '_shell.html',
    })
    expect(config.shellPath).toBe('_shell.html')
  })

  it('accepts toolbar config on views', () => {
    const config = defineConfig({
      name: 'my-ext',
      displayName: 'My Extension',
      version: '1.0.0',
      views: [
        {
          id: 'main',
          title: 'Main',
          route: '/',
          location: 'toolbar',
          toolbar: { openIn: 'editor', vsCodeIcon: 'browser' },
        },
      ],
    })
    expect(config.views![0].toolbar?.openIn).toBe('editor')
    expect(config.views![0].toolbar?.vsCodeIcon).toBe('browser')
  })
})
