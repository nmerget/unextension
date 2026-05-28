import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  generateAppSettingsState,
  generateProjectSettingsState,
} from '../targets/jetbrains/settings-state.js'
import { generateSettingsConfigurable } from '../targets/jetbrains/settings-configurable.js'
import type { SettingDefinition, UnextensionConfig } from '../config.js'

/**
 * Property-based tests for JetBrains settings scaffolding.
 *
 * Feature: plugin-settings
 */
describe('JetBrains settings scaffolding — property tests', () => {
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
   * Helper: generate a valid string SettingDefinition.
   */
  const stringSettingArb = fc.record({
    key: validKeyArb,
    type: fc.constant('string' as const),
    default: fc.string({ minLength: 0, maxLength: 20 }),
    description: fc.string({ minLength: 1, maxLength: 50 }),
    scope: fc.option(fc.constantFrom('global' as const, 'workspace' as const), { nil: undefined }),
  })

  /**
   * Helper: generate a valid number SettingDefinition.
   */
  const numberSettingArb = fc.record({
    key: validKeyArb,
    type: fc.constant('number' as const),
    default: fc.integer({ min: -1000, max: 1000 }),
    description: fc.string({ minLength: 1, maxLength: 50 }),
    scope: fc.option(fc.constantFrom('global' as const, 'workspace' as const), { nil: undefined }),
  })

  /**
   * Helper: generate a valid boolean SettingDefinition.
   */
  const booleanSettingArb = fc.record({
    key: validKeyArb,
    type: fc.constant('boolean' as const),
    default: fc.boolean(),
    description: fc.string({ minLength: 1, maxLength: 50 }),
    scope: fc.option(fc.constantFrom('global' as const, 'workspace' as const), { nil: undefined }),
  })

  /**
   * Helper: generate a valid enum SettingDefinition.
   */
  const enumSettingArb = fc
    .array(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,9}$/), { minLength: 1, maxLength: 6 })
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
    )

  /**
   * Helper: generate any valid SettingDefinition.
   */
  const settingArb: fc.Arbitrary<SettingDefinition> = fc.oneof(
    stringSettingArb,
    numberSettingArb,
    booleanSettingArb,
    enumSettingArb,
  ) as fc.Arbitrary<SettingDefinition>

  /**
   * Helper: create a minimal UnextensionConfig with given settings.
   */
  function makeConfig(settings: SettingDefinition[]): UnextensionConfig {
    return {
      name: 'test-extension',
      displayName: 'Test Extension',
      version: '1.0.0',
      settings,
    }
  }

  /**
   * Property 7: JetBrains type-to-component mapping
   *
   * For any valid SettingDefinition, the JetBrains scaffolder SHALL produce Kotlin code
   * containing the appropriate UI component:
   * - `string` → `JBTextField` (without numeric filter)
   * - `number` → `JBTextField` with numeric filter (DocumentFilter)
   * - `boolean` → `JBCheckBox`
   * - `enum` → `ComboBox` with all defined options in the `arrayOf(...)` call
   *
   * **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
   */
  describe('Property 7: JetBrains type-to-component mapping', () => {
    it('string settings produce a JTextField field declaration', () => {
      fc.assert(
        fc.property(stringSettingArb, (setting) => {
          const config = makeConfig([setting as SettingDefinition])
          const code = generateSettingsConfigurable(config)
          // String settings use JTextField
          expect(code).toContain('JTextField')
        }),
        { numRuns: 100 },
      )
    })

    it('number settings produce a JTextField field declaration (numeric input)', () => {
      fc.assert(
        fc.property(numberSettingArb, (setting) => {
          const config = makeConfig([setting as SettingDefinition])
          const code = generateSettingsConfigurable(config)
          // Number settings also use JTextField (with numeric parsing in apply/isModified)
          expect(code).toContain('JTextField')
          // The generated code should reference toIntOrNull for numeric parsing
          expect(code).toContain('toIntOrNull')
        }),
        { numRuns: 100 },
      )
    })

    it('boolean settings produce a JCheckBox field declaration', () => {
      fc.assert(
        fc.property(booleanSettingArb, (setting) => {
          const config = makeConfig([setting as SettingDefinition])
          const code = generateSettingsConfigurable(config)
          expect(code).toContain('JCheckBox')
        }),
        { numRuns: 100 },
      )
    })

    it('enum settings produce a JComboBox with all defined options in arrayOf(...)', () => {
      fc.assert(
        fc.property(enumSettingArb, (setting) => {
          const config = makeConfig([setting as SettingDefinition])
          const code = generateSettingsConfigurable(config)
          // Enum settings use JComboBox
          expect(code).toContain('JComboBox')
          // All options should appear in the arrayOf(...) call
          expect(code).toContain('arrayOf(')
          for (const option of setting.options) {
            expect(code).toContain(`"${option}"`)
          }
        }),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 8: JetBrains scope mapping
   *
   * For any valid SettingDefinition:
   * - Global-scoped settings appear in `AppSettingsState` (generated by `generateAppSettingsState`)
   * - Workspace-scoped settings appear in `ProjectSettingsState` (generated by `generateProjectSettingsState`)
   * - Global settings do NOT appear in ProjectSettingsState
   * - Workspace settings do NOT appear in AppSettingsState
   *
   * **Validates: Requirements 3.7, 3.8**
   */
  describe('Property 8: JetBrains scope mapping', () => {
    it('global-scoped settings appear in AppSettingsState', () => {
      fc.assert(
        fc.property(settingArb, (setting) => {
          const globalSetting = { ...setting, scope: 'global' as const }
          const appState = generateAppSettingsState([globalSetting])
          const fieldName = setting.key.replace(/\.([a-zA-Z])/g, (_, c: string) => c.toUpperCase())
          // The data class State(...) block should contain a field declaration for this setting
          const stateBlockMatch = appState.match(/data class State\(([\s\S]*?)\)/)
          const stateBlock = stateBlockMatch ? stateBlockMatch[1] : ''
          expect(stateBlock).toContain(`var ${fieldName}:`)
          expect(appState).toContain('AppSettingsState')
        }),
        { numRuns: 100 },
      )
    })

    it('workspace-scoped settings appear in ProjectSettingsState', () => {
      fc.assert(
        fc.property(settingArb, (setting) => {
          const workspaceSetting = { ...setting, scope: 'workspace' as const }
          const projectState = generateProjectSettingsState([workspaceSetting])
          const fieldName = setting.key.replace(/\.([a-zA-Z])/g, (_, c: string) => c.toUpperCase())
          // The data class State(...) block should contain a field declaration for this setting
          const stateBlockMatch = projectState.match(/data class State\(([\s\S]*?)\)/)
          const stateBlock = stateBlockMatch ? stateBlockMatch[1] : ''
          expect(stateBlock).toContain(`var ${fieldName}:`)
          expect(projectState).toContain('ProjectSettingsState')
        }),
        { numRuns: 100 },
      )
    })

    it('global-scoped settings do NOT appear in ProjectSettingsState', () => {
      fc.assert(
        fc.property(settingArb, (setting) => {
          const globalSetting = { ...setting, scope: 'global' as const }
          const projectState = generateProjectSettingsState([globalSetting])
          const fieldName = setting.key.replace(/\.([a-zA-Z])/g, (_, c: string) => c.toUpperCase())
          // The data class State(...) block should not contain a field declaration for this setting
          const stateBlockMatch = projectState.match(/data class State\(([\s\S]*?)\)/)
          const stateBlock = stateBlockMatch ? stateBlockMatch[1] : ''
          expect(stateBlock).not.toContain(`var ${fieldName}:`)
        }),
        { numRuns: 100 },
      )
    })

    it('workspace-scoped settings do NOT appear in AppSettingsState', () => {
      fc.assert(
        fc.property(settingArb, (setting) => {
          const workspaceSetting = { ...setting, scope: 'workspace' as const }
          const appState = generateAppSettingsState([workspaceSetting])
          const fieldName = setting.key.replace(/\.([a-zA-Z])/g, (_, c: string) => c.toUpperCase())
          // The data class State(...) block should not contain a field declaration for this setting
          const stateBlockMatch = appState.match(/data class State\(([\s\S]*?)\)/)
          const stateBlock = stateBlockMatch ? stateBlockMatch[1] : ''
          expect(stateBlock).not.toContain(`var ${fieldName}:`)
        }),
        { numRuns: 100 },
      )
    })

    it('settings with no scope (defaults to global) appear in AppSettingsState', () => {
      fc.assert(
        fc.property(settingArb, (setting) => {
          const noScopeSetting = { ...setting, scope: undefined }
          const appState = generateAppSettingsState([noScopeSetting])
          const fieldName = setting.key.replace(/\.([a-zA-Z])/g, (_, c: string) => c.toUpperCase())
          // The data class State(...) block should contain a field declaration for this setting
          const stateBlockMatch = appState.match(/data class State\(([\s\S]*?)\)/)
          const stateBlock = stateBlockMatch ? stateBlockMatch[1] : ''
          expect(stateBlock).toContain(`var ${fieldName}:`)
        }),
        { numRuns: 100 },
      )
    })

    it('settings with no scope (defaults to global) do NOT appear in ProjectSettingsState', () => {
      fc.assert(
        fc.property(settingArb, (setting) => {
          const noScopeSetting = { ...setting, scope: undefined }
          const projectState = generateProjectSettingsState([noScopeSetting])
          const fieldName = setting.key.replace(/\.([a-zA-Z])/g, (_, c: string) => c.toUpperCase())
          // The data class State(...) block should not contain a field declaration for this setting
          const stateBlockMatch = projectState.match(/data class State\(([\s\S]*?)\)/)
          const stateBlock = stateBlockMatch ? stateBlockMatch[1] : ''
          expect(stateBlock).not.toContain(`var ${fieldName}:`)
        }),
        { numRuns: 100 },
      )
    })
  })
})
