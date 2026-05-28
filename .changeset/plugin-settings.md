---
'@unextension/cli': minor
'@unextension/bridge': minor
---

feat: add plugin settings support

Extension authors can now define configurable settings in `unextension.config.ts`. Settings are scaffolded into each target IDE's native settings infrastructure:

- **VS Code**: `contributes.configuration` in `package.json` with settings change listener
- **JetBrains**: `SettingsConfigurable.kt` with `PersistentStateComponent` for persistence

A new `useSettings()` bridge action provides a reactive store that auto-updates when the user changes settings in the IDE.

### New APIs

- `useSettings(defaults)` — creates a reactive `SettingsStore` with `get()` and `subscribe()` methods
- `SettingDefinition` types: `string`, `number`, `boolean`, `enum`
- `validateSettings()` — validates settings at build time (key format, type/default consistency, enum options)

### CLI changes

- Settings validation runs during `unextension build` and `unextension sync`
- VS Code target generates `contributes.configuration` and `get-settings.js` action handler
- JetBrains target generates `AppSettingsState.kt`, `ProjectSettingsState.kt`, `SettingsConfigurable.kt`, and `GetSettings.kt`
