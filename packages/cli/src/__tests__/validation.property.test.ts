import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { validateSettings } from '../validation.js'
import type { SettingDefinition } from '../config.js'

/**
 * Property-based tests for settings validation logic.
 *
 * Feature: plugin-settings
 */
describe('Settings validation — property tests', () => {
  /** The regex used by the validator for key format */
  const KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)*$/

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
   * Helper: generate an arbitrary string that may or may not be valid dot-notation.
   */
  const arbitraryStringArb = fc.string({ minLength: 0, maxLength: 30 })

  /**
   * Property 1: Setting key validation accepts only dot-notation
   *
   * For any string, the key validator SHALL accept it if and only if it matches
   * the pattern of one or more alphanumeric segments (starting with a letter)
   * separated by dots.
   *
   * **Validates: Requirements 1.2**
   */
  describe('Property 1: Setting key validation accepts only dot-notation', () => {
    it('valid dot-notation keys produce no key-format errors', () => {
      fc.assert(
        fc.property(validKeyArb, (key) => {
          const settings: SettingDefinition[] = [
            { key, type: 'string', default: 'test', description: 'test' },
          ]
          const errors = validateSettings(settings)
          const keyErrors = errors.filter((e) => e.message === 'Key must be in dot-notation format')
          expect(keyErrors).toHaveLength(0)
        }),
        { numRuns: 100 },
      )
    })

    it('arbitrary strings are accepted iff they match the dot-notation regex', () => {
      fc.assert(
        fc.property(arbitraryStringArb, (key) => {
          const settings: SettingDefinition[] = [
            { key, type: 'string', default: 'test', description: 'test' },
          ]
          const errors = validateSettings(settings)
          const keyErrors = errors.filter((e) => e.message === 'Key must be in dot-notation format')

          if (KEY_REGEX.test(key)) {
            expect(keyErrors).toHaveLength(0)
          } else {
            expect(keyErrors).toHaveLength(1)
          }
        }),
        { numRuns: 100 },
      )
    })

    it('keys starting with a digit are rejected', () => {
      const digitStartArb = fc
        .tuple(fc.stringMatching(/^[0-9]$/), fc.stringMatching(/^[a-zA-Z0-9]{0,5}$/))
        .map(([d, rest]) => d + rest)
        .filter((s) => s.length > 0)

      fc.assert(
        fc.property(digitStartArb, (key) => {
          const settings: SettingDefinition[] = [
            { key, type: 'string', default: 'test', description: 'test' },
          ]
          const errors = validateSettings(settings)
          const keyErrors = errors.filter((e) => e.message === 'Key must be in dot-notation format')
          expect(keyErrors).toHaveLength(1)
        }),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 2: Type/default consistency validation
   *
   * For any SettingDefinition, the validator SHALL accept it if and only if
   * the default value's runtime type matches the declared type
   * (string→string, number→number, boolean→boolean).
   *
   * **Validates: Requirements 1.4, 7.1, 7.4**
   */
  describe('Property 2: Type/default consistency validation', () => {
    /** Generate a non-enum setting with a matching type/default pair */
    const matchingTypeDefaultArb = fc.oneof(
      fc.string().map((d) => ({ type: 'string' as const, default: d })),
      fc
        .double({ noNaN: true, noDefaultInfinity: true })
        .map((d) => ({ type: 'number' as const, default: d })),
      fc.boolean().map((d) => ({ type: 'boolean' as const, default: d })),
    )

    /** Generate a non-enum setting with a mismatched type/default pair */
    const mismatchedTypeDefaultArb = fc.oneof(
      // type is 'string' but default is number
      fc
        .double({ noNaN: true, noDefaultInfinity: true })
        .map((d) => ({ type: 'string' as const, default: d as unknown as string })),
      // type is 'string' but default is boolean
      fc.boolean().map((d) => ({ type: 'string' as const, default: d as unknown as string })),
      // type is 'number' but default is string
      fc.string().map((d) => ({ type: 'number' as const, default: d as unknown as number })),
      // type is 'number' but default is boolean
      fc.boolean().map((d) => ({ type: 'number' as const, default: d as unknown as number })),
      // type is 'boolean' but default is string
      fc.string().map((d) => ({ type: 'boolean' as const, default: d as unknown as boolean })),
      // type is 'boolean' but default is number
      fc
        .double({ noNaN: true, noDefaultInfinity: true })
        .map((d) => ({ type: 'boolean' as const, default: d as unknown as boolean })),
    )

    it('matching type/default produces no type-mismatch errors', () => {
      fc.assert(
        fc.property(validKeyArb, matchingTypeDefaultArb, (key, { type, default: def }) => {
          const settings = [{ key, type, default: def, description: 'test' }] as SettingDefinition[]
          const errors = validateSettings(settings)
          const typeErrors = errors.filter((e) =>
            e.message.startsWith('Default value must be of type'),
          )
          expect(typeErrors).toHaveLength(0)
        }),
        { numRuns: 100 },
      )
    })

    it('mismatched type/default produces a type-mismatch error', () => {
      fc.assert(
        fc.property(validKeyArb, mismatchedTypeDefaultArb, (key, { type, default: def }) => {
          const settings = [{ key, type, default: def, description: 'test' }] as SettingDefinition[]
          const errors = validateSettings(settings)
          const typeErrors = errors.filter((e) =>
            e.message.startsWith('Default value must be of type'),
          )
          expect(typeErrors).toHaveLength(1)
        }),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 3: Enum default must be in options
   *
   * For any EnumSettingDefinition, the validator SHALL accept it if and only if
   * the default value is contained within the options array.
   *
   * **Validates: Requirements 1.5, 7.2**
   */
  describe('Property 3: Enum default must be in options', () => {
    /** Generate a valid enum setting where default is in options */
    const validEnumArb = fc
      .array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 6 })
      .chain((options) =>
        fc.integer({ min: 0, max: options.length - 1 }).map((idx) => ({
          options,
          default: options[idx],
        })),
      )

    /** Generate an invalid enum setting where default is NOT in options */
    const invalidEnumArb = fc
      .tuple(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 6 }),
        fc.string({ minLength: 1, maxLength: 10 }),
      )
      .filter(([options, def]) => !options.includes(def))
      .map(([options, def]) => ({ options, default: def }))

    it('enum with default in options produces no enum-default errors', () => {
      fc.assert(
        fc.property(validKeyArb, validEnumArb, (key, { options, default: def }) => {
          const settings: SettingDefinition[] = [
            { key, type: 'enum', default: def, options, description: 'test' },
          ]
          const errors = validateSettings(settings)
          const enumErrors = errors.filter(
            (e) => e.message === 'Default value must be one of the defined options',
          )
          expect(enumErrors).toHaveLength(0)
        }),
        { numRuns: 100 },
      )
    })

    it('enum with default NOT in options produces an enum-default error', () => {
      fc.assert(
        fc.property(validKeyArb, invalidEnumArb, (key, { options, default: def }) => {
          const settings: SettingDefinition[] = [
            { key, type: 'enum', default: def, options, description: 'test' },
          ]
          const errors = validateSettings(settings)
          const enumErrors = errors.filter(
            (e) => e.message === 'Default value must be one of the defined options',
          )
          expect(enumErrors).toHaveLength(1)
        }),
        { numRuns: 100 },
      )
    })

    it('enum with empty options array produces an error', () => {
      fc.assert(
        fc.property(validKeyArb, fc.string({ minLength: 1, maxLength: 10 }), (key, def) => {
          const settings: SettingDefinition[] = [
            { key, type: 'enum', default: def, options: [], description: 'test' },
          ]
          const errors = validateSettings(settings)
          const emptyOptionsErrors = errors.filter(
            (e) => e.message === 'Enum settings require a non-empty options array',
          )
          expect(emptyOptionsErrors).toHaveLength(1)
        }),
        { numRuns: 100 },
      )
    })
  })
})
