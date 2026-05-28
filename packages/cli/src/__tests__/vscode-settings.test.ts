import { describe, it, expect } from 'vitest'
import { generateVSCodeConfiguration } from '../targets/vscode/index.js'
import type { UnextensionConfig } from '../config.js'

function makeConfig(overrides: Partial<UnextensionConfig> = {}): UnextensionConfig {
  return {
    name: 'my-extension',
    displayName: 'My Extension',
    version: '1.0.0',
    ...overrides,
  }
}

describe('generateVSCodeConfiguration', () => {
  describe('setting type output', () => {
    it('produces correct output for a string setting', () => {
      const config = makeConfig({
        settings: [
          {
            key: 'editor.fontFamily',
            type: 'string',
            default: 'Consolas',
            description: 'Font family',
          },
        ],
      })
      const result = generateVSCodeConfiguration(config) as {
        title: string
        properties: Record<string, unknown>
      }

      expect(result.properties['my-extension.editor.fontFamily']).toEqual({
        type: 'string',
        default: 'Consolas',
        description: 'Font family',
        scope: 'application',
      })
    })

    it('produces correct output for a number setting', () => {
      const config = makeConfig({
        settings: [
          {
            key: 'editor.fontSize',
            type: 'number',
            default: 14,
            description: 'Font size in pixels',
          },
        ],
      })
      const result = generateVSCodeConfiguration(config) as {
        title: string
        properties: Record<string, unknown>
      }

      expect(result.properties['my-extension.editor.fontSize']).toEqual({
        type: 'number',
        default: 14,
        description: 'Font size in pixels',
        scope: 'application',
      })
    })

    it('produces correct output for a boolean setting', () => {
      const config = makeConfig({
        settings: [
          {
            key: 'editor.wordWrap',
            type: 'boolean',
            default: true,
            description: 'Enable word wrap',
          },
        ],
      })
      const result = generateVSCodeConfiguration(config) as {
        title: string
        properties: Record<string, unknown>
      }

      expect(result.properties['my-extension.editor.wordWrap']).toEqual({
        type: 'boolean',
        default: true,
        description: 'Enable word wrap',
        scope: 'application',
      })
    })

    it('produces correct output for an enum setting', () => {
      const config = makeConfig({
        settings: [
          {
            key: 'editor.theme',
            type: 'enum',
            default: 'dark',
            options: ['light', 'dark', 'auto'],
            description: 'Color theme',
          },
        ],
      })
      const result = generateVSCodeConfiguration(config) as {
        title: string
        properties: Record<string, unknown>
      }

      expect(result.properties['my-extension.editor.theme']).toEqual({
        type: 'string',
        default: 'dark',
        description: 'Color theme',
        scope: 'application',
        enum: ['light', 'dark', 'auto'],
      })
    })
  })

  describe('scope mapping', () => {
    it('maps global scope to "application"', () => {
      const config = makeConfig({
        settings: [
          {
            key: 'general.name',
            type: 'string',
            default: 'World',
            description: 'Name',
            scope: 'global',
          },
        ],
      })
      const result = generateVSCodeConfiguration(config) as {
        title: string
        properties: Record<string, unknown>
      }

      expect(
        (result.properties['my-extension.general.name'] as Record<string, unknown>).scope,
      ).toBe('application')
    })

    it('maps workspace scope to "resource"', () => {
      const config = makeConfig({
        settings: [
          {
            key: 'project.autoSave',
            type: 'boolean',
            default: false,
            description: 'Auto save',
            scope: 'workspace',
          },
        ],
      })
      const result = generateVSCodeConfiguration(config) as {
        title: string
        properties: Record<string, unknown>
      }

      expect(
        (result.properties['my-extension.project.autoSave'] as Record<string, unknown>).scope,
      ).toBe('resource')
    })

    it('defaults to "application" when scope is omitted', () => {
      const config = makeConfig({
        settings: [
          { key: 'general.verbose', type: 'boolean', default: false, description: 'Verbose mode' },
        ],
      })
      const result = generateVSCodeConfiguration(config) as {
        title: string
        properties: Record<string, unknown>
      }

      expect(
        (result.properties['my-extension.general.verbose'] as Record<string, unknown>).scope,
      ).toBe('application')
    })
  })

  describe('key namespacing', () => {
    it('prefixes each setting key with the extension name', () => {
      const config = makeConfig({
        name: 'cool-plugin',
        settings: [
          { key: 'editor.fontSize', type: 'number', default: 14, description: 'Font size' },
        ],
      })
      const result = generateVSCodeConfiguration(config) as {
        title: string
        properties: Record<string, unknown>
      }

      expect(result.properties).toHaveProperty('cool-plugin.editor.fontSize')
      expect(result.properties).not.toHaveProperty('editor.fontSize')
    })

    it('uses the correct prefix for multiple settings', () => {
      const config = makeConfig({
        name: 'test-ext',
        settings: [
          { key: 'a', type: 'string', default: 'x', description: 'A' },
          { key: 'b.c', type: 'number', default: 1, description: 'B.C' },
        ],
      })
      const result = generateVSCodeConfiguration(config) as {
        title: string
        properties: Record<string, unknown>
      }

      expect(Object.keys(result.properties)).toEqual(['test-ext.a', 'test-ext.b.c'])
    })
  })

  describe('empty/undefined settings', () => {
    it('returns undefined when settings is an empty array', () => {
      const config = makeConfig({ settings: [] })
      expect(generateVSCodeConfiguration(config)).toBeUndefined()
    })

    it('returns undefined when settings is undefined', () => {
      const config = makeConfig({ settings: undefined })
      expect(generateVSCodeConfiguration(config)).toBeUndefined()
    })

    it('returns undefined when settings is not provided', () => {
      const config = makeConfig()
      expect(generateVSCodeConfiguration(config)).toBeUndefined()
    })
  })

  describe('title', () => {
    it('sets title to config.displayName', () => {
      const config = makeConfig({
        displayName: 'Awesome Extension',
        settings: [{ key: 'enabled', type: 'boolean', default: true, description: 'Enable' }],
      })
      const result = generateVSCodeConfiguration(config) as {
        title: string
        properties: Record<string, unknown>
      }

      expect(result.title).toBe('Awesome Extension')
    })
  })
})
