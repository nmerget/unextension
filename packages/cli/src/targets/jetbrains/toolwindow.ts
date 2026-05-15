import { generateKotlinActions } from './actions.js'

export function generateToolWindowFactory(
  className: string,
  route: string,
  devMode: boolean,
): string {
  const routeRelative = route === '/' || route === '' ? '' : route.replace(/^\//, '')
  const classNameLower = className.toLowerCase()
  const { functions: actionFunctions, dispatch: actionDispatch } = generateKotlinActions()

  return `package com.unextension

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefJSQuery
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter
import javax.swing.JLabel
import javax.swing.JPanel
import java.awt.BorderLayout

class ${className}ToolWindowFactory : ToolWindowFactory {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val contentManager = toolWindow.contentManager

        if (!JBCefApp.isSupported()) {
            val fallback = JPanel(BorderLayout())
            fallback.add(JLabel("JCEF is not available. Enable via Help → Find Action → Registry → ide.browser.jcef.enabled."), BorderLayout.CENTER)
            contentManager.addContent(contentManager.factory.createContent(fallback, "", false))
            return
        }

        val htmlContent = resolveWebviewHtml() ?: run {
            val fallback = JPanel(BorderLayout())
            fallback.add(JLabel("Webview not found. Run your app build then 'unextension sync'."), BorderLayout.CENTER)
            contentManager.addContent(contentManager.factory.createContent(fallback, "", false))
            return
        }
        val browser = JBCefBrowser(htmlContent)
        val jsQuery = JBCefJSQuery.create(browser)

        jsQuery.addHandler { msg ->
            println("[unextension] message from webview (${classNameLower}): $msg")
            try {
                val parsed = org.json.JSONObject(msg)
                val type = parsed.optString("type", "unknown")
                val payload = parsed.optJSONObject("payload")
                val correlationId = parsed.optString("correlationId", "")
                val reply = org.json.JSONObject()
                if (correlationId.isNotEmpty()) reply.put("correlationId", correlationId)
${actionDispatch}

                val replyJson = reply.toString().replace("\\\\", "\\\\\\\\").replace("'", "\\\\'")
                val js = "window.dispatchEvent(new MessageEvent('message', { data: JSON.parse('$replyJson') }));"
                browser.cefBrowser.executeJavaScript(js, browser.cefBrowser.url, 0)
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

                val themeJs = """
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
                """.trimIndent()
                b.executeJavaScript(themeJs, b.url, 0)

                val inject = jsQuery.inject(
                    "msg",
                    "function(r){}",
                    "function(code,msg){console.error('[unextension] bridge error',code,msg);}"
                )
                val bridgeJs = """
                    (function() {
                        window.__unextension_jb_bridge = function(msg) { $inject };
                    })();
                """.trimIndent()
                b.executeJavaScript(bridgeJs, b.url, 0)
            }
        }
        browser.jbCefClient.addLoadHandler(loadHandler, browser.cefBrowser)

        com.intellij.openapi.util.Disposer.register(toolWindow.disposable) {
            browser.jbCefClient.removeLoadHandler(loadHandler, browser.cefBrowser)
            jsQuery.dispose()
            browser.dispose()
        }

        ${
          devMode
            ? `toolWindow.setTitleActions(listOf(object : AnAction("Open DevTools", "Open browser DevTools", com.intellij.icons.AllIcons.Debugger.Console) {
            override fun actionPerformed(e: AnActionEvent) { browser.openDevtools() }
        }))`
            : ''
        }
        contentManager.addContent(contentManager.factory.createContent(browser.component, "", false))
    }

${actionFunctions}

    private fun resolveWebviewHtml(): String? {
        val tmpDir = java.io.File(System.getProperty("java.io.tmpdir"), "unextension-webview-${classNameLower}")
        tmpDir.mkdirs()
        val stream = this::class.java.getResourceAsStream("/webview/index.html") ?: return null
        var html = stream.use { it.bufferedReader().readText() }
        val route = if ("${routeRelative}".isEmpty()) "/" else "/${routeRelative}"
        val routeScript = "<script>window.__UNEXTENSION_ROUTE__=" + org.json.JSONObject.quote(route) + ";</script>"
        html = html.replace("</head>", "\${routeScript}</head>")
        java.io.File(tmpDir, "index.html").writeText(html)
        return java.io.File(tmpDir, "index.html").toURI().toString()
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
`
}
