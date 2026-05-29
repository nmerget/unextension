import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { generateVSCodeConfiguration } from '../targets/vscode/index.js'
import type { SettingDefinition, UnextensionConfig } from '../config.js'

/**
 * Property-based tests for VS Code settings scaffolding.
 *
 * Feature: plugin-settings
 */
describe('VS Code settings scaffolding — property tests', () => {
  /**
   * Helper: generate a valid dot-notation segment (starts with letter, followed by alphanumeric).
   */
  const segmentArb = fc
    .tuple(fc.stringMatching(/^[a-zA-Z]$/), fc.stringMatching(/^[a-zA-Z0-9]{0,8}$/))
    .map(([first, rest]) => first + rest)

  /**
   * Helper: generate a valid dot-notation key (1-4 segments joined by dots).
   */
  const validKeyArb = fc
    .array(segmentArb, { minLength: 1, maxLength: 4 })
    .map((segments) => segments.join('.'))

  /**
   * Helper: generate a valid extension name (kebab-case).
   */
  const extensionNameArb = fc
    .array(fc.stringMatching(/^[a-z][a-z0-9]{0,6}$/), { minLength: 1, maxLength: 3 })
    .map((parts) => parts.join('-'))

  /**
   * Helper: generate a valid SettingDefinition of any type.
   */
  const settingDefinitionArb: fc.Arbitrary<SettingDefinition> = fc.oneof(
    // string setting
    fc.record({
      key: validKeyArb,
      type: fc.constant('string' as const),
      default: fc.string({ minLength: 0, maxLength: 20 }),
      description: fc.string({ minLength: 1, maxLength: 50 }),
      scope: fc.option(fc.constantFrom('global' as const, 'workspace' as const), {
        nil: undefined,
      }),
    }),
    // number setting
    fc.record({
      key: validKeyArb,
      type: fc.constant('number' as const),
      default: fc.double({ noNaN: true, noDefaultInfinity: true, min: -1000, max: 1000 }),
      description: fc.string({ minLength: 1, maxLength: 50 }),
      scope: fc.option(fc.constantFrom('global' as const, 'workspace' as const), {
        nil: undefined,
      }),
    }),
    // boolean setting
    fc.record({
      key: validKeyArb,
      type: fc.constant('boolean' as const),
      default: fc.boolean(),
      description: fc.string({ minLength: 1, maxLength: 50 }),
      scope: fc.option(fc.constantFrom('global' as const, 'workspace' as const), {
        nil: undefined,
      }),
    }),
    // enum setting
    fc
      .array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 6 })
      .chain((options) =>
        fc.record({
          key: validKeyArb,
          type: fc.constant('enum' as const),
          default: fc.constantFrom(...options),
          options: fc.constant(options),
          description: fc.string({ minLength: 1, maxLength: 50 }),
          scope: fc.option(fc.constantFrom('global' as const, 'workspace' as const), {
            nil: undefined,
          }),
        }),
      ),
  )

  /**
   * Helper: build a minimal UnextensionConfig with a given name and settings.
   */
  function makeConfig(name: string, settings: SettingDefinition[]): UnextensionConfig {
    return {
      name,
      displayName: 'Test Extension',
      version: '1.0.0',
      settings,
    }
  }

  /**
   * Property 4: VS Code type mapping preserves setting semantics
   *
   * For any valid SettingDefinition, the generated configuration property has the correct
   * `type` field (string→"string", number→"number", boolean→"boolean", enum→"string"
   * with `enum` array containing all options).
   *
   * **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
   */
  describe('Property 4: VS Code type mapping preserves setting semantics', () => {
    it('string settings produce type "string"', () => {
      fc.assert(
        fc.property(
          extensionNameArb,
          validKeyArb,
          fc.string({ minLength: 0, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (name, key, def, desc) => {
            const setting: SettingDefinition = {
              key,
              type: 'string',
              default: def,
              description: desc,
            }
            const config = makeConfig(name, [setting])
            const result = generateVSCodeConfiguration(config) as {
              properties: Record<string, Record<string, unknown>>
            }

            const fullKey = `${name}.${key}`
            expect(result.properties[fullKey].type).toBe('string')
          },
        ),
        { numRuns: 100 },
      )
    })

    it('number settings produce type "number"', () => {
      fc.assert(
        fc.property(
          extensionNameArb,
          validKeyArb,
          fc.double({ noNaN: true, noDefaultInfinity: true, min: -1000, max: 1000 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (name, key, def, desc) => {
            const setting: SettingDefinition = {
              key,
              type: 'number',
              default: def,
              description: desc,
            }
            const config = makeConfig(name, [setting])
            const result = generateVSCodeConfiguration(config) as {
              properties: Record<string, Record<string, unknown>>
            }

            const fullKey = `${name}.${key}`
            expect(result.properties[fullKey].type).toBe('number')
          },
        ),
        { numRuns: 100 },
      )
    })

    it('boolean settings produce type "boolean"', () => {
      fc.assert(
        fc.property(
          extensionNameArb,
          validKeyArb,
          fc.boolean(),
          fc.string({ minLength: 1, maxLength: 50 }),
          (name, key, def, desc) => {
            const setting: SettingDefinition = {
              key,
              type: 'boolean',
              default: def,
              description: desc,
            }
            const config = makeConfig(name, [setting])
            const result = generateVSCodeConfiguration(config) as {
              properties: Record<string, Record<string, unknown>>
            }

            const fullKey = `${name}.${key}`
            expect(result.properties[fullKey].type).toBe('boolean')
          },
        ),
        { numRuns: 100 },
      )
    })

    it('enum settings produce type "string" with enum array containing all options', () => {
      const enumSettingArb = fc
        .array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 6 })
        .chain((options) =>
          fc.record({
            key: validKeyArb,
            default: fc.constantFrom(...options),
            options: fc.constant(options),
            description: fc.string({ minLength: 1, maxLength: 50 }),
          }),
        )

      fc.assert(
        fc.property(
          extensionNameArb,
          enumSettingArb,
          (name, { key, default: def, options, description }) => {
            const setting: SettingDefinition = {
              key,
              type: 'enum',
              default: def,
              options,
              description,
            }
            const config = makeConfig(name, [setting])
            const result = generateVSCodeConfiguration(config) as {
              properties: Record<string, Record<string, unknown>>
            }

            const fullKey = `${name}.${key}`
            expect(result.properties[fullKey].type).toBe('string')
            expect(result.properties[fullKey].enum).toEqual(options)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 5: VS Code scaffolding preserves all setting metadata
   *
   * For any valid SettingDefinition, the generated configuration property contains the
   * `default` value, `description` string, and correct `scope` mapping
   * (global→"application", workspace→"resource").
   *
   * **Validates: Requirements 2.6, 2.7, 2.8, 2.9**
   */
  describe('Property 5: VS Code scaffolding preserves all setting metadata', () => {
    it('default value is preserved in the generated property', () => {
      fc.assert(
        fc.property(extensionNameArb, settingDefinitionArb, (name, setting) => {
          const config = makeConfig(name, [setting])
          const result = generateVSCodeConfiguration(config) as {
            properties: Record<string, Record<string, unknown>>
          }

          const fullKey = `${name}.${setting.key}`
          expect(result.properties[fullKey].default).toEqual(setting.default)
        }),
        { numRuns: 100 },
      )
    })

    it('description is preserved in the generated property', () => {
      fc.assert(
        fc.property(extensionNameArb, settingDefinitionArb, (name, setting) => {
          const config = makeConfig(name, [setting])
          const result = generateVSCodeConfiguration(config) as {
            properties: Record<string, Record<string, unknown>>
          }

          const fullKey = `${name}.${setting.key}`
          expect(result.properties[fullKey].description).toBe(setting.description)
        }),
        { numRuns: 100 },
      )
    })

    it('global scope maps to "application"', () => {
      fc.assert(
        fc.property(extensionNameArb, settingDefinitionArb, (name, setting) => {
          const settingWithGlobalScope = { ...setting, scope: 'global' as const }
          const config = makeConfig(name, [settingWithGlobalScope])
          const result = generateVSCodeConfiguration(config) as {
            properties: Record<string, Record<string, unknown>>
          }

          const fullKey = `${name}.${setting.key}`
          expect(result.properties[fullKey].scope).toBe('application')
        }),
        { numRuns: 100 },
      )
    })

    it('workspace scope maps to "resource"', () => {
      fc.assert(
        fc.property(extensionNameArb, settingDefinitionArb, (name, setting) => {
          const settingWithWorkspaceScope = { ...setting, scope: 'workspace' as const }
          const config = makeConfig(name, [settingWithWorkspaceScope])
          const result = generateVSCodeConfiguration(config) as {
            properties: Record<string, Record<string, unknown>>
          }

          const fullKey = `${name}.${setting.key}`
          expect(result.properties[fullKey].scope).toBe('resource')
        }),
        { numRuns: 100 },
      )
    })

    it('omitted scope defaults to "application" (global)', () => {
      fc.assert(
        fc.property(extensionNameArb, settingDefinitionArb, (name, setting) => {
          // Remove scope to test default behavior
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { scope: _unusedScope, ...settingWithoutScope } = setting as SettingDefinition & {
            scope?: unknown
          }
          const config = makeConfig(name, [settingWithoutScope as SettingDefinition])
          const result = generateVSCodeConfiguration(config) as {
            properties: Record<string, Record<string, unknown>>
          }

          const fullKey = `${name}.${setting.key}`
          expect(result.properties[fullKey].scope).toBe('application')
        }),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 6: VS Code key namespacing
   *
   * For any valid SettingDefinition with key K in an extension with name N,
   * the generated property key is N.K.
   *
   * **Validates: Requirements 2.10**
   */
  describe('Property 6: VS Code key namespacing', () => {
    it('generated property key is extensionName.settingKey', () => {
      fc.assert(
        fc.property(extensionNameArb, settingDefinitionArb, (name, setting) => {
          const config = makeConfig(name, [setting])
          const result = generateVSCodeConfiguration(config) as {
            properties: Record<string, unknown>
          }

          const expectedKey = `${name}.${setting.key}`
          expect(Object.keys(result.properties)).toContain(expectedKey)
        }),
        { numRuns: 100 },
      )
    })

    it('all generated keys start with the extension name prefix', () => {
      const multipleSettingsArb = fc
        .array(settingDefinitionArb, { minLength: 1, maxLength: 5 })
        // Ensure unique keys
        .map((settings) => {
          const seen = new Set<string>()
          return settings.filter((s) => {
            if (seen.has(s.key)) return false
            seen.add(s.key)
            return true
          })
        })
        .filter((settings) => settings.length > 0)

      fc.assert(
        fc.property(extensionNameArb, multipleSettingsArb, (name, settings) => {
          const config = makeConfig(name, settings)
          const result = generateVSCodeConfiguration(config) as {
            properties: Record<string, unknown>
          }

          for (const key of Object.keys(result.properties)) {
            expect(key.startsWith(`${name}.`)).toBe(true)
          }
        }),
        { numRuns: 100 },
      )
    })

    it('the number of generated properties equals the number of settings', () => {
      const multipleSettingsArb = fc
        .array(settingDefinitionArb, { minLength: 1, maxLength: 5 })
        // Ensure unique keys
        .map((settings) => {
          const seen = new Set<string>()
          return settings.filter((s) => {
            if (seen.has(s.key)) return false
            seen.add(s.key)
            return true
          })
        })
        .filter((settings) => settings.length > 0)

      fc.assert(
        fc.property(extensionNameArb, multipleSettingsArb, (name, settings) => {
          const config = makeConfig(name, settings)
          const result = generateVSCodeConfiguration(config) as {
            properties: Record<string, unknown>
          }

          expect(Object.keys(result.properties)).toHaveLength(settings.length)
        }),
        { numRuns: 100 },
      )
    })
  })
})
