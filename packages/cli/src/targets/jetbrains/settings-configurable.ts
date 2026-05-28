import type { UnextensionConfig } from '../../config.js'
import { settingKeyToKotlinField, defaultToKotlinLiteral } from './settings-state.js'

/**
 * Generates the WebviewBrowserRegistry.kt singleton that tracks active JBCefBrowser instances.
 * This allows the SettingsConfigurable to push messages to the webview.
 */
export function generateWebviewBrowserRegistry(): string {
  return `package com.unextension

import com.intellij.ui.jcef.JBCefBrowser

object WebviewBrowserRegistry {
    private val browsers = mutableSetOf<JBCefBrowser>()

    fun register(browser: JBCefBrowser) {
        browsers.add(browser)
    }

    fun unregister(browser: JBCefBrowser) {
        browsers.remove(browser)
    }

    fun postMessage(json: String) {
        val escaped = json.replace("\\\\", "\\\\\\\\").replace("'", "\\\\'")
        val js = "window.dispatchEvent(new MessageEvent('message', { data: JSON.parse('$escaped') }));"
        for (browser in browsers) {
            try {
                browser.cefBrowser.executeJavaScript(js, browser.cefBrowser.url, 0)
            } catch (e: Exception) {
                println("[unextension] Failed to post message to webview: \${e.message}")
            }
        }
    }
}
`
}

/**
 * Generates the SettingsConfigurable.kt Kotlin source for the JetBrains settings panel.
 * Implements the Configurable interface with UI components per setting type.
 * When apply() is called, it persists settings and pushes a settings-changed message to the webview.
 */
export function generateSettingsConfigurable(config: UnextensionConfig): string {
  const settings = config.settings ?? []
  const displayName = config.displayName

  const globalSettings = settings.filter((s) => (s.scope ?? 'global') === 'global')
  const workspaceSettings = settings.filter((s) => s.scope === 'workspace')

  const uiFieldDeclarations = settings
    .map((s) => {
      const fieldName = settingKeyToKotlinField(s.key)
      switch (s.type) {
        case 'string':
          return `    private var ${fieldName}Field: javax.swing.JTextField? = null`
        case 'number':
          return `    private var ${fieldName}Field: javax.swing.JTextField? = null`
        case 'boolean':
          return `    private var ${fieldName}Field: javax.swing.JCheckBox? = null`
        case 'enum':
          return `    private var ${fieldName}Field: javax.swing.JComboBox<String>? = null`
      }
    })
    .join('\n')

  const createComponentBody = settings
    .map((s) => {
      const fieldName = settingKeyToKotlinField(s.key)
      const label = s.title ?? s.key
      const tooltip = s.description
      switch (s.type) {
        case 'string':
          return `        ${fieldName}Field = javax.swing.JTextField(20).also { it.toolTipText = "${escapeKotlinString(tooltip)}" }
        builder.addLabeledComponent(javax.swing.JLabel("${escapeKotlinString(label)}:"), ${fieldName}Field!!, 1, false)`
        case 'number':
          return `        ${fieldName}Field = javax.swing.JTextField(10).also { it.toolTipText = "${escapeKotlinString(tooltip)}" }
        builder.addLabeledComponent(javax.swing.JLabel("${escapeKotlinString(label)}:"), ${fieldName}Field!!, 1, false)`
        case 'boolean':
          return `        ${fieldName}Field = javax.swing.JCheckBox("${escapeKotlinString(label)}").also { it.toolTipText = "${escapeKotlinString(tooltip)}" }
        builder.addComponent(${fieldName}Field!!, 1)`
        case 'enum':
          return `        ${fieldName}Field = javax.swing.JComboBox(arrayOf(${s.options.map((o) => `"${escapeKotlinString(o)}"`).join(', ')})).also { it.toolTipText = "${escapeKotlinString(tooltip)}" }
        builder.addLabeledComponent(javax.swing.JLabel("${escapeKotlinString(label)}:"), ${fieldName}Field!!, 1, false)`
      }
    })
    .join('\n')

  const isModifiedChecks = settings
    .map((s) => {
      const fieldName = settingKeyToKotlinField(s.key)
      const stateVar = (s.scope ?? 'global') === 'global' ? 'appState' : 'projectState'
      switch (s.type) {
        case 'string':
          return `        if (${fieldName}Field?.text != ${stateVar}.${fieldName}) return true`
        case 'enum':
          return `        if ((${fieldName}Field?.selectedItem as? String) != ${stateVar}.${fieldName}) return true`
        case 'number':
          return `        if ((${fieldName}Field?.text?.toIntOrNull() ?: 0) != ${stateVar}.${fieldName}) return true`
        case 'boolean':
          return `        if (${fieldName}Field?.isSelected != ${stateVar}.${fieldName}) return true`
      }
    })
    .join('\n')

  const applyStatements = settings
    .map((s) => {
      const fieldName = settingKeyToKotlinField(s.key)
      const stateVar = (s.scope ?? 'global') === 'global' ? 'appState' : 'projectState'
      switch (s.type) {
        case 'string':
          return `        ${stateVar}.${fieldName} = ${fieldName}Field?.text ?: ${defaultToKotlinLiteral(s)}`
        case 'enum':
          return `        ${stateVar}.${fieldName} = (${fieldName}Field?.selectedItem as? String) ?: ${defaultToKotlinLiteral(s)}`
        case 'number':
          return `        ${stateVar}.${fieldName} = ${fieldName}Field?.text?.toIntOrNull() ?: ${defaultToKotlinLiteral(s)}`
        case 'boolean':
          return `        ${stateVar}.${fieldName} = ${fieldName}Field?.isSelected ?: ${defaultToKotlinLiteral(s)}`
      }
    })
    .join('\n')

  const resetStatements = settings
    .map((s) => {
      const fieldName = settingKeyToKotlinField(s.key)
      const stateVar = (s.scope ?? 'global') === 'global' ? 'appState' : 'projectState'
      switch (s.type) {
        case 'string':
          return `        ${fieldName}Field?.text = ${stateVar}.${fieldName}`
        case 'enum':
          return `        ${fieldName}Field?.selectedItem = ${stateVar}.${fieldName}`
        case 'number':
          return `        ${fieldName}Field?.text = ${stateVar}.${fieldName}.toString()`
        case 'boolean':
          return `        ${fieldName}Field?.isSelected = ${stateVar}.${fieldName}`
      }
    })
    .join('\n')

  // Build the settings-changed payload for the notification
  const notifyPayloadEntries = settings
    .map((s) => {
      const fieldName = settingKeyToKotlinField(s.key)
      const stateVar = (s.scope ?? 'global') === 'global' ? 'appState' : 'projectState'
      return `        payload.put("${s.key}", ${stateVar}.${fieldName})`
    })
    .join('\n')

  // Determine which state objects are needed
  const needsAppState = globalSettings.length > 0
  const needsProjectState = workspaceSettings.length > 0

  const stateGetters = [
    needsAppState ? '        val appState = AppSettingsState.getInstance().state' : '',
    needsProjectState
      ? '        val projectState = ProjectSettingsState.getInstance(project).state'
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const stateGettersApply = [
    needsAppState ? '        val appState = AppSettingsState.getInstance().state' : '',
    needsProjectState
      ? '        val projectState = ProjectSettingsState.getInstance(project).state'
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  // For project-scoped settings, we need a project reference
  const classDeclaration = needsProjectState
    ? `class SettingsConfigurable(private val project: Project) : Configurable {`
    : `class SettingsConfigurable : Configurable {`

  return `package com.unextension

import com.intellij.openapi.options.Configurable
${needsProjectState ? 'import com.intellij.openapi.project.Project\n' : ''}import com.intellij.util.ui.FormBuilder
import javax.swing.*

${classDeclaration}
    private var panel: JPanel? = null
${uiFieldDeclarations}

    override fun getDisplayName(): String = "${escapeKotlinString(displayName)}"

    override fun createComponent(): JComponent {
        val builder = FormBuilder.createFormBuilder()

${createComponentBody}

        panel = builder.addComponentFillVertically(JPanel(), 0).panel
        reset()
        return panel!!
    }

    override fun isModified(): Boolean {
${stateGetters}
${isModifiedChecks}
        return false
    }

    override fun apply() {
${stateGettersApply}
${applyStatements}

        // Push settings-changed message to the webview
        val message = org.json.JSONObject()
        message.put("type", "settings-changed")
        val payload = org.json.JSONObject()
${notifyPayloadEntries}
        message.put("payload", payload)
        WebviewBrowserRegistry.postMessage(message.toString())
    }

    override fun reset() {
${stateGetters}
${resetStatements}
    }
}
`
}

function escapeKotlinString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$')
}
