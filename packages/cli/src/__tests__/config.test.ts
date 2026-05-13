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
      spa: true,
      scriptsDir: './scripts',
      targets: ['vscode'],
      views: [{ id: 'main', title: 'Main', route: '/' }],
    })
    expect(config.spa).toBe(true)
    expect(config.scriptsDir).toBe('./scripts')
    expect(config.targets).toEqual(['vscode'])
    expect(config.views).toHaveLength(1)
  })

  it('accepts spa as object with shellPath', () => {
    const config = defineConfig({
      name: 'my-ext',
      displayName: 'My Extension',
      version: '1.0.0',
      spa: { shellPath: '_shell.html' },
    })
    expect(config.spa).toEqual({ shellPath: '_shell.html' })
  })
})
