export { defineConfig } from './config.js'
export type {
  UnextensionConfig,
  CommandsConfig,
  ViewConfig,
  ViewLocation,
  ToolbarConfig,
  ToolbarOpenIn,
  VSCodeIcon,
  SettingType,
  SettingScope,
  SettingDefinitionBase,
  StringSettingDefinition,
  NumberSettingDefinition,
  BooleanSettingDefinition,
  EnumSettingDefinition,
  SettingDefinition,
} from './config.js'

export { validateSettings } from './validation.js'
export type { ValidationError } from './validation.js'

export {
  generateAppSettingsState,
  generateProjectSettingsState,
  settingKeyToKotlinField,
  settingTypeToKotlinType,
  defaultToKotlinLiteral,
} from './targets/jetbrains/settings-state.js'

export { generateSettingsConfigurable } from './targets/jetbrains/settings-configurable.js'
