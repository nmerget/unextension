import type { SettingDefinition } from '../../config.js'

/**
 * Converts a dot-notation setting key to a valid Kotlin camelCase field name.
 * e.g. "editor.fontSize" → "editorFontSize"
 */
export function settingKeyToKotlinField(key: string): string {
  return key.replace(/\.([a-zA-Z])/g, (_, c: string) => c.toUpperCase())
}

/**
 * Maps a SettingDefinition type to the corresponding Kotlin type.
 */
export function settingTypeToKotlinType(type: SettingDefinition['type']): string {
  switch (type) {
    case 'string':
      return 'String'
    case 'number':
      return 'Int'
    case 'boolean':
      return 'Boolean'
    case 'enum':
      return 'String'
  }
}

/**
 * Formats a default value as a Kotlin literal.
 */
export function defaultToKotlinLiteral(setting: SettingDefinition): string {
  switch (setting.type) {
    case 'string':
    case 'enum':
      return `"${setting.default.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    case 'number':
      return String(setting.default)
    case 'boolean':
      return String(setting.default)
  }
}

/**
 * Generates the AppSettingsState.kt Kotlin source for global-scoped settings.
 */
export function generateAppSettingsState(settings: SettingDefinition[]): string {
  const globalSettings = settings.filter((s) => (s.scope ?? 'global') === 'global')

  const fields = globalSettings
    .map((s) => {
      const fieldName = settingKeyToKotlinField(s.key)
      const kotlinType = settingTypeToKotlinType(s.type)
      const defaultVal = defaultToKotlinLiteral(s)
      return `        var ${fieldName}: ${kotlinType} = ${defaultVal}`
    })
    .join(',\n')

  return `package com.unextension

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage

@State(name = "UnextensionAppSettings", storages = [Storage("unextension-settings.xml")])
class AppSettingsState : PersistentStateComponent<AppSettingsState.State> {
    data class State(
${fields}
    )

    private var myState = State()
    override fun getState(): State = myState
    override fun loadState(state: State) { myState = state }

    companion object {
        fun getInstance(): AppSettingsState =
            ApplicationManager.getApplication().getService(AppSettingsState::class.java)
    }
}
`
}

/**
 * Generates the ProjectSettingsState.kt Kotlin source for workspace-scoped settings.
 */
export function generateProjectSettingsState(settings: SettingDefinition[]): string {
  const workspaceSettings = settings.filter((s) => s.scope === 'workspace')

  const fields = workspaceSettings
    .map((s) => {
      const fieldName = settingKeyToKotlinField(s.key)
      const kotlinType = settingTypeToKotlinType(s.type)
      const defaultVal = defaultToKotlinLiteral(s)
      return `        var ${fieldName}: ${kotlinType} = ${defaultVal}`
    })
    .join(',\n')

  return `package com.unextension

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.project.Project

@State(name = "UnextensionProjectSettings", storages = [Storage("unextension-project-settings.xml")])
class ProjectSettingsState(private val project: Project) : PersistentStateComponent<ProjectSettingsState.State> {
    data class State(
${fields}
    )

    private var myState = State()
    override fun getState(): State = myState
    override fun loadState(state: State) { myState = state }

    companion object {
        fun getInstance(project: Project): ProjectSettingsState =
            project.getService(ProjectSettingsState::class.java)
    }
}
`
}
