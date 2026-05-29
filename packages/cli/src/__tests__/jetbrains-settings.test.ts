import { describe, it, expect } from 'vitest'
import {
  generateAppSettingsState,
  generateProjectSettingsState,
  settingKeyToKotlinField,
  settingTypeToKotlinType,
} from '../targets/jetbrains/settings-state.js'
import { generateSettingsConfigurable } from '../targets/jetbrains/settings-configurable.js'
import type { SettingDefinition, UnextensionConfig } from '../config.js'

describe('settingKeyToKotlinField', () => {
  it('converts dot-notation to camelCase', () => {
    expect(settingKeyToKotlinField('editor.fontSize')).toBe('editorFontSize')
  })

  it('returns single-segment keys unchanged', () => {
    expect(settingKeyToKotlinField('verbose')).toBe('verbose')
  })

  it('handles multiple dot segments', () => {
    expect(settingKeyToKotlinField('editor.font.size')).toBe('editorFontSize')
  })
})

describe('settingTypeToKotlinType', () => {
  it('maps string to String', () => {
    expect(settingTypeToKotlinType('string')).toBe('String')
  })

  it('maps number to Int', () => {
    expect(settingTypeToKotlinType('number')).toBe('Int')
  })

  it('maps boolean to Boolean', () => {
    expect(settingTypeToKotlinType('boolean')).toBe('Boolean')
  })

  it('maps enum to String', () => {
    expect(settingTypeToKotlinType('enum')).toBe('String')
  })
})

describe('generateAppSettingsState', () => {
  const globalSettings: SettingDefinition[] = [
    { key: 'editor.fontSize', type: 'number', default: 14, description: 'Font size' },
    { key: 'editor.fontFamily', type: 'string', default: 'Consolas', description: 'Font family' },
    { key: 'verbose', type: 'boolean', default: false, description: 'Verbose mode' },
  ]

  it('contains global settings fields with correct Kotlin types', () => {
    const output = generateAppSettingsState(globalSettings)
    expect(output).toContain('var editorFontSize: Int = 14')
    expect(output).toContain('var editorFontFamily: String = "Consolas"')
    expect(output).toContain('var verbose: Boolean = false')
  })

  it('uses @State annotation with UnextensionAppSettings name', () => {
    const output = generateAppSettingsState(globalSettings)
    expect(output).toContain('@State(name = "UnextensionAppSettings"')
  })

  it('uses ApplicationManager for application-level storage', () => {
    const output = generateAppSettingsState(globalSettings)
    expect(output).toContain(
      'ApplicationManager.getApplication().getService(AppSettingsState::class.java)',
    )
  })

  it('filters out workspace-scoped settings', () => {
    const mixedSettings: SettingDefinition[] = [
      { key: 'global.setting', type: 'string', default: 'val', description: 'Global' },
      {
        key: 'workspace.setting',
        type: 'string',
        default: 'val',
        description: 'Workspace',
        scope: 'workspace',
      },
    ]
    const output = generateAppSettingsState(mixedSettings)
    expect(output).toContain('var globalSetting: String')
    expect(output).not.toContain('var workspaceSetting')
  })
})

describe('generateProjectSettingsState', () => {
  const workspaceSettings: SettingDefinition[] = [
    {
      key: 'workspace.autoSave',
      type: 'boolean',
      default: true,
      description: 'Auto save',
      scope: 'workspace',
    },
    {
      key: 'workspace.tabSize',
      type: 'number',
      default: 4,
      description: 'Tab size',
      scope: 'workspace',
    },
  ]

  it('contains workspace settings fields with correct Kotlin types', () => {
    const output = generateProjectSettingsState(workspaceSettings)
    expect(output).toContain('var workspaceAutoSave: Boolean = true')
    expect(output).toContain('var workspaceTabSize: Int = 4')
  })

  it('uses @State annotation with UnextensionProjectSettings name', () => {
    const output = generateProjectSettingsState(workspaceSettings)
    expect(output).toContain('@State(name = "UnextensionProjectSettings"')
  })

  it('uses project.getService for project-level storage', () => {
    const output = generateProjectSettingsState(workspaceSettings)
    expect(output).toContain('project.getService(ProjectSettingsState::class.java)')
  })

  it('filters out global-scoped settings', () => {
    const mixedSettings: SettingDefinition[] = [
      { key: 'global.setting', type: 'string', default: 'val', description: 'Global' },
      {
        key: 'workspace.setting',
        type: 'string',
        default: 'val',
        description: 'Workspace',
        scope: 'workspace',
      },
    ]
    const output = generateProjectSettingsState(mixedSettings)
    expect(output).toContain('var workspaceSetting: String')
    expect(output).not.toContain('var globalSetting')
  })
})

describe('generateSettingsConfigurable', () => {
  const config: UnextensionConfig = {
    name: 'my-extension',
    displayName: 'My Extension',
    version: '1.0.0',
    settings: [
      {
        key: 'editor.fontFamily',
        type: 'string',
        default: 'Consolas',
        description: 'The font family to use',
      },
      {
        key: 'editor.fontSize',
        type: 'number',
        default: 14,
        description: 'The font size in pixels',
      },
      {
        key: 'editor.wordWrap',
        type: 'boolean',
        default: true,
        description: 'Enable word wrapping',
      },
      {
        key: 'editor.theme',
        type: 'enum',
        default: 'dark',
        options: ['light', 'dark', 'auto'],
        description: 'Color theme selection',
      },
    ],
  }

  it('contains JTextField for string type', () => {
    const output = generateSettingsConfigurable(config)
    expect(output).toContain('JTextField')
    expect(output).toContain('editorFontFamilyField: javax.swing.JTextField')
  })

  it('contains JTextField for number type (with numeric field)', () => {
    const output = generateSettingsConfigurable(config)
    expect(output).toContain('editorFontSizeField: javax.swing.JTextField')
  })

  it('contains JCheckBox for boolean type', () => {
    const output = generateSettingsConfigurable(config)
    expect(output).toContain('JCheckBox')
    expect(output).toContain('editorWordWrapField: javax.swing.JCheckBox')
  })

  it('contains JComboBox for enum type with all options', () => {
    const output = generateSettingsConfigurable(config)
    expect(output).toContain('JComboBox')
    expect(output).toContain('editorThemeField: javax.swing.JComboBox<String>')
    expect(output).toContain('"light"')
    expect(output).toContain('"dark"')
    expect(output).toContain('"auto"')
  })

  it('uses config.displayName as getDisplayName() return value', () => {
    const output = generateSettingsConfigurable(config)
    expect(output).toContain('override fun getDisplayName(): String = "My Extension"')
  })

  it('includes tooltip with description text', () => {
    const output = generateSettingsConfigurable(config)
    expect(output).toContain('toolTipText = "The font family to use"')
    expect(output).toContain('toolTipText = "The font size in pixels"')
    expect(output).toContain('toolTipText = "Enable word wrapping"')
    expect(output).toContain('toolTipText = "Color theme selection"')
  })
})
