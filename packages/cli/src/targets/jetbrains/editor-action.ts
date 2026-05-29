import { generateKotlinActions } from './actions.js'

/**
 * Generates a Kotlin file containing:
 * 1. A VirtualFile subclass for the editor tab
 * 2. A FileEditorProvider that creates a JCEF webview with full bridge support
 * 3. A FileEditor wrapping the JCEF browser
 * 4. An AnAction to open the editor tab programmatically
 *
 * This opens the webview in the main editor area (center tabs) with the bridge
 * working identically to tool windows.
 */
export function generateEditorAction(
  className: string,
  title: string,
  route: string,
  devMode: boolean,
  commandsAllow?: string[],
  hasSettings?: boolean,
): string {
  const routeRelative = route === '/' || route === '' ? '' : route.replace(/^\//, '')
  const classNameLower = className.toLowerCase()
  const escapedTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const tripleQuote = '"""'
  const {
    functions: actionFunctions,
    dispatch: actionDispatch,
    needsProcessRegistry,
  } = generateKotlinActions()

  const commandsAllowProperty = commandsAllow
    ? `    private val commandsAllow: List<String>? = listOf(${commandsAllow.map((cmd) => `"${cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(', ')})`
    : `    private val commandsAllow: List<String>? = null`

  const processRegistryMembers = needsProcessRegistry
    ? `
    private val jbProcessRegistry = mutableMapOf<String, Process>()

    private fun postStreamEvent(
        browser: JBCefBrowser,
        processId: String,
        eventType: String,
        data: String?,
        exitCode: Int? = null
    ) {
        val event = org.json.JSONObject()
        event.put("processId", processId)
        val eventPayload = org.json.JSONObject()
        eventPayload.put("type", eventType)
        if (data != null) eventPayload.put("data", data)
        if (exitCode != null) eventPayload.put("exitCode", exitCode)
        event.put("payload", eventPayload)

        val json = event.toString().replace("\\\\", "\\\\\\\\").replace("'", "\\\\'")
        val js = "window.dispatchEvent(new MessageEvent('message', { data: JSON.parse('$json') }));"
        browser.cefBrowser.executeJavaScript(js, browser.cefBrowser.url, 0)
    }
`
    : ''

  const processRegistryCleanup = needsProcessRegistry
    ? `
            for ((_, proc) in jbProcessRegistry) {
                proc.destroyForcibly()
            }
            jbProcessRegistry.clear()`
    : ''

  return `package com.unextension

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.fileEditor.*
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.testFramework.LightVirtualFile
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefJSQuery
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter
import javax.swing.*
import java.awt.BorderLayout
import java.beans.PropertyChangeListener

/**
 * Virtual file used to identify ${className} editor tabs.
 */
class ${className}VirtualFile : LightVirtualFile("${escapedTitle}", "") {
    override fun isWritable(): Boolean = false
    override fun isValid(): Boolean = true
}

/**
 * FileEditorProvider that opens a JCEF webview in the main editor area.
 * Bridge communication works identically to tool windows.
 */
class ${className}EditorProvider : FileEditorProvider, com.intellij.openapi.project.DumbAware {
    override fun getEditorTypeId(): String = "com.unextension.${classNameLower}.editor"
    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.HIDE_DEFAULT_EDITOR

    override fun accept(project: Project, file: VirtualFile): Boolean {
        return file is ${className}VirtualFile
    }

    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        return ${className}FileEditor(project)
    }
}

/**
 * FileEditor wrapping a JCEF browser with full bridge support.
 */
class ${className}FileEditor(private val project: Project) : com.intellij.openapi.util.UserDataHolderBase(), FileEditor {
${commandsAllowProperty}
    private val panel: JPanel = JPanel(BorderLayout())
    private var browser: JBCefBrowser? = null
    private var jsQuery: JBCefJSQuery? = null

    init {
        if (!JBCefApp.isSupported()) {
            panel.add(JLabel("JCEF is not available. Enable via Help \\u2192 Find Action \\u2192 Registry \\u2192 ide.browser.jcef.enabled."), BorderLayout.CENTER)
        } else {
            val htmlContent = resolveWebviewHtml()
            if (htmlContent == null) {
                panel.add(JLabel("Webview not found. Run your app build then 'unextension sync'."), BorderLayout.CENTER)
            } else {
                val jbBrowser = JBCefBrowser(htmlContent)
                browser = jbBrowser
                ${hasSettings ? 'WebviewBrowserRegistry.register(jbBrowser)\n                ' : ''}val query = JBCefJSQuery.create(jbBrowser)
                jsQuery = query

                query.addHandler { msg ->
                    println("[unextension] message from editor (${classNameLower}): $msg")
                    try {
                        val parsed = org.json.JSONObject(msg)
                        val type = parsed.optString("type", "unknown")
                        val payload = parsed.optJSONObject("payload")
                        val correlationId = parsed.optString("correlationId", "")
                        val reply = org.json.JSONObject()
                        val browser = jbBrowser
                        if (correlationId.isNotEmpty()) reply.put("correlationId", correlationId)
${actionDispatch}

                        val replyJson = reply.toString().replace("\\\\", "\\\\\\\\").replace("'", "\\\\'")
                        val js = "window.dispatchEvent(new MessageEvent('message', { data: JSON.parse('$replyJson') }));"
                        jbBrowser.cefBrowser.executeJavaScript(js, jbBrowser.cefBrowser.url, 0)
                    } catch (e: Exception) {
                        println("[unextension] Failed to handle message: \${e.message}")
                    }
                    null
                }

                val loadHandler = object : CefLoadHandlerAdapter() {
                    override fun onLoadEnd(b: CefBrowser, frame: CefFrame, httpStatusCode: Int) {
                        if (!frame.isMain) return

                        fun colorHex(key: String, fallback: String): String {
                            val c = javax.swing.UIManager.getColor(key) ?: return fallback
                            return String.format("#%02x%02x%02x", c.red, c.green, c.blue)
                        }
                        val bg = colorHex("Panel.background", "#1e1e1e")
                        val fg = colorHex("Panel.foreground", "#d4d4d4")
                        val inputBg = colorHex("TextField.background", "#2d2d2d")
                        val inputFg = colorHex("TextField.foreground", "#d4d4d4")
                        val borderColor = colorHex("Separator.foreground", "#3c3c3c")
                        val selectionBg = colorHex("List.selectionBackground", "#0e639c")
                        val selectionFg = colorHex("List.selectionForeground", "#ffffff")
                        val linkFg = colorHex("Link.activeForeground", "#4ec9b0")
                        val isDark = (javax.swing.UIManager.getColor("Panel.background")?.let {
                            (it.red * 299 + it.green * 587 + it.blue * 114) / 1000 < 128
                        } ?: true)
                        val colorScheme = if (isDark) "dark" else "light"

                        val themeJs = ${tripleQuote}
                            (function() {
                                var root = document.documentElement;
                                root.style.setProperty('--ide-bg', '${'$'}bg');
                                root.style.setProperty('--ide-fg', '${'$'}fg');
                                root.style.setProperty('--ide-input-bg', '${'$'}inputBg');
                                root.style.setProperty('--ide-input-fg', '${'$'}inputFg');
                                root.style.setProperty('--ide-border', '${'$'}borderColor');
                                root.style.setProperty('--ide-selection-bg', '${'$'}selectionBg');
                                root.style.setProperty('--ide-selection-fg', '${'$'}selectionFg');
                                root.style.setProperty('--ide-link', '${'$'}linkFg');
                                root.setAttribute('data-ide-theme', '${'$'}colorScheme');
                                root.style.colorScheme = '${'$'}colorScheme';
                                document.body.style.background = '${'$'}bg';
                                document.body.style.color = '${'$'}fg';
                            })();
                        ${tripleQuote}.trimIndent()
                        b.executeJavaScript(themeJs, b.url, 0)

                        val inject = query.inject(
                            "msg",
                            "function(r){}",
                            "function(code,msg){console.error('[unextension] bridge error',code,msg);}"
                        )
                        val bridgeJs = ${tripleQuote}
                            (function() {
                                window.__unextension_jb_bridge = function(msg) { $inject };
                            })();
                        ${tripleQuote}.trimIndent()
                        b.executeJavaScript(bridgeJs, b.url, 0)
                    }
                }
                jbBrowser.jbCefClient.addLoadHandler(loadHandler, jbBrowser.cefBrowser)
                panel.add(jbBrowser.component, BorderLayout.CENTER)
            }
        }
    }

    override fun getComponent(): JComponent = panel
    override fun getPreferredFocusedComponent(): JComponent? = panel
    override fun getName(): String = "${escapedTitle}"
    override fun getFile(): VirtualFile = ${className}VirtualFile()
    override fun isModified(): Boolean = false
    override fun isValid(): Boolean = true
    override fun addPropertyChangeListener(listener: PropertyChangeListener) {}
    override fun removePropertyChangeListener(listener: PropertyChangeListener) {}
    override fun setState(state: FileEditorState) {}

    override fun dispose() {${processRegistryCleanup}
        ${hasSettings ? 'browser?.let { WebviewBrowserRegistry.unregister(it) }\n        ' : ''}jsQuery?.dispose()
        browser?.dispose()
    }

${actionFunctions}
${processRegistryMembers}
    private fun resolveWebviewHtml(): String? {
        val tmpDir = java.io.File(System.getProperty("java.io.tmpdir"), "unextension-editor-${classNameLower}")
        tmpDir.mkdirs()
        val stream = this::class.java.getResourceAsStream("/webview/index.html") ?: return null
        var html = stream.use { it.bufferedReader().readText() }
        val route = if ("${routeRelative}".isEmpty()) "/" else "/${routeRelative}"
        val routeScript = "<script>window.__UNEXTENSION_ROUTE__=" + org.json.JSONObject.quote(route) + ";</script>"
        html = html.replace("</head>", "\${routeScript}</head>")
        val file = java.io.File(tmpDir, "index.html")
        file.writeText(html)
        return file.toURI().toString()
    }

    private fun runShellCommand(command: String, shell: String, flag: String): Triple<String, String, Int> {
        return try {
            val proc = ProcessBuilder(shell, flag, command)
            proc.redirectErrorStream(false)
            val process = proc.start()
            val stdout = process.inputStream.bufferedReader().readText()
            val stderr = process.errorStream.bufferedReader().readText()
            val exitCode = process.waitFor()
            Triple(stdout, stderr, exitCode)
        } catch (e: Exception) {
            Triple("", e.message ?: "Unknown error", 1)
        }
    }
}

/**
 * Action to open the ${className} editor tab.
 */
class ${className}EditorAction : AnAction("Open ${escapedTitle}", "Open ${escapedTitle} in editor tab", null) {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val file = ${className}VirtualFile()
        FileEditorManager.getInstance(project).openFile(file, true)
    }
}
`
}
