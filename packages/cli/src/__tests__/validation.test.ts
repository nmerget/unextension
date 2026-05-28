import { describe, it, expect } from 'vitest'
import { validateSettings } from '../validation.js'
import type { SettingDefinition } from '../config.js'

describe('validateSettings', () => {
  describe('valid settings pass validation', () => {
    it('accepts a valid string setting', () => {
      const settings: SettingDefinition[] = [
        {
          key: 'editor.fontFamily',
          type: 'string',
          default: 'Consolas',
          description: 'Font family',
        },
      ]
      expect(validateSettings(settings)).toEqual([])
    })

    it('accepts a valid number setting', () => {
      const settings: SettingDefinition[] = [
        { key: 'editor.fontSize', type: 'number', default: 14, description: 'Font size' },
      ]
      expect(validateSettings(settings)).toEqual([])
    })

    it('accepts a valid boolean setting', () => {
      const settings: SettingDefinition[] = [
        { key: 'editor.wordWrap', type: 'boolean', default: true, description: 'Word wrap' },
      ]
      expect(validateSettings(settings)).toEqual([])
    })

    it('accepts a valid enum setting', () => {
      const settings: SettingDefinition[] = [
        {
          key: 'editor.theme',
          type: 'enum',
          default: 'dark',
          options: ['light', 'dark', 'auto'],
          description: 'Color theme',
        },
      ]
      expect(validateSettings(settings)).toEqual([])
    })

    it('accepts multiple valid settings', () => {
      const settings: SettingDefinition[] = [
        { key: 'general.name', type: 'string', default: 'World', description: 'Name' },
        { key: 'general.count', type: 'number', default: 5, description: 'Count' },
        { key: 'general.enabled', type: 'boolean', default: false, description: 'Enabled' },
      ]
      expect(validateSettings(settings)).toEqual([])
    })

    it('accepts a single-segment key', () => {
      const settings: SettingDefinition[] = [
        { key: 'verbose', type: 'boolean', default: false, description: 'Verbose mode' },
      ]
      expect(validateSettings(settings)).toEqual([])
    })
  })

  describe('invalid key format', () => {
    it('rejects keys with spaces', () => {
      const settings: SettingDefinition[] = [
        { key: 'my setting', type: 'string', default: 'val', description: 'desc' },
      ]
      const errors = validateSettings(settings)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toBe('Key must be in dot-notation format')
    })

    it('rejects keys starting with a number', () => {
      const settings: SettingDefinition[] = [
        { key: '1setting', type: 'string', default: 'val', description: 'desc' },
      ]
      const errors = validateSettings(settings)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toBe('Key must be in dot-notation format')
    })

    it('rejects keys with empty segments (consecutive dots)', () => {
      const settings: SettingDefinition[] = [
        { key: 'a..b', type: 'string', default: 'val', description: 'desc' },
      ]
      const errors = validateSettings(settings)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toBe('Key must be in dot-notation format')
    })

    it('rejects keys with special characters', () => {
      const settings: SettingDefinition[] = [
        { key: 'my-setting', type: 'string', default: 'val', description: 'desc' },
      ]
      const errors = validateSettings(settings)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toBe('Key must be in dot-notation format')
    })

    it('rejects keys starting with a dot', () => {
      const settings: SettingDefinition[] = [
        { key: '.leading', type: 'string', default: 'val', description: 'desc' },
      ]
      const errors = validateSettings(settings)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toBe('Key must be in dot-notation format')
    })

    it('rejects keys ending with a dot', () => {
      const settings: SettingDefinition[] = [
        { key: 'trailing.', type: 'string', default: 'val', description: 'desc' },
      ]
      const errors = validateSettings(settings)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toBe('Key must be in dot-notation format')
    })
  })

  describe('duplicate keys', () => {
    it('produces error for duplicate keys', () => {
      const settings: SettingDefinition[] = [
        { key: 'editor.fontSize', type: 'number', default: 14, description: 'Font size' },
        { key: 'editor.fontSize', type: 'number', default: 16, description: 'Font size again' },
      ]
      const errors = validateSettings(settings)
      expect(errors.some((e) => e.message === 'Duplicate setting key')).toBe(true)
    })
  })

  describe('type/default mismatch', () => {
    it('rejects number type with string default', () => {
      const settings = [
        { key: 'editor.fontSize', type: 'number', default: 'fourteen', description: 'Font size' },
      ] as unknown as SettingDefinition[]
      const errors = validateSettings(settings)
      expect(errors.some((e) => e.message === 'Default value must be of type number')).toBe(true)
    })

    it('rejects boolean type with number default', () => {
      const settings = [
        { key: 'editor.enabled', type: 'boolean', default: 1, description: 'Enabled' },
      ] as unknown as SettingDefinition[]
      const errors = validateSettings(settings)
      expect(errors.some((e) => e.message === 'Default value must be of type boolean')).toBe(true)
    })

    it('rejects string type with boolean default', () => {
      const settings = [
        { key: 'editor.name', type: 'string', default: true, description: 'Name' },
      ] as unknown as SettingDefinition[]
      const errors = validateSettings(settings)
      expect(errors.some((e) => e.message === 'Default value must be of type string')).toBe(true)
    })
  })

  describe('enum validation', () => {
    it('rejects enum default not in options', () => {
      const settings: SettingDefinition[] = [
        {
          key: 'editor.theme',
          type: 'enum',
          default: 'midnight',
          options: ['light', 'dark', 'auto'],
          description: 'Theme',
        },
      ]
      const errors = validateSettings(settings)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toBe('Default value must be one of the defined options')
    })

    it('rejects enum with empty options array', () => {
      const settings: SettingDefinition[] = [
        {
          key: 'editor.theme',
          type: 'enum',
          default: 'dark',
          options: [],
          description: 'Theme',
        },
      ]
      const errors = validateSettings(settings)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toBe('Enum settings require a non-empty options array')
    })
  })
})
