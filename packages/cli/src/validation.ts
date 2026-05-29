import type { SettingDefinition } from './config.js'

export interface ValidationError {
  path: string
  message: string
}

export function validateSettings(settings: SettingDefinition[]): ValidationError[] {
  const errors: ValidationError[] = []
  const seenKeys = new Set<string>()

  for (const setting of settings) {
    const prefix = `settings[${setting.key}]`

    // Key format: dot-notation (e.g. "editor.fontSize", "general.theme")
    if (!/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)*$/.test(setting.key)) {
      errors.push({ path: prefix, message: 'Key must be in dot-notation format' })
    }

    // Duplicate key check
    if (seenKeys.has(setting.key)) {
      errors.push({ path: prefix, message: 'Duplicate setting key' })
    }
    seenKeys.add(setting.key)

    // Type/default consistency
    if (setting.type === 'enum') {
      if (!setting.options || setting.options.length === 0) {
        errors.push({ path: prefix, message: 'Enum settings require a non-empty options array' })
      } else if (!setting.options.includes(setting.default)) {
        errors.push({ path: prefix, message: 'Default value must be one of the defined options' })
      }
    } else {
      if (typeof setting.default !== setting.type) {
        errors.push({ path: prefix, message: `Default value must be of type ${setting.type}` })
      }
    }
  }

  return errors
}
