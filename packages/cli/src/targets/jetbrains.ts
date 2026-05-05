import path from 'node:path'
import https from 'node:https'
import fs from 'fs-extra'
import type { UnextensionConfig } from '../config.js'

const DEFAULT_GRADLE_VERSION = '8.7'
const DEFAULT_KOTLIN_VERSION = '2.1.0'
const DEFAULT_INTELLIJ_PLATFORM_VERSION = '2.2.1'
const DEFAULT_JVM_TARGET = 21
const DEFAULT_IDE_VERSION = '2024.3'
const DEFAULT_GROUP = 'com.unextension'
const GRADLE_VERSION_RE = /^\d+\.\d+(\.\d+)?$/
const ALLOWED_REDIRECT_HOSTS = ['raw.githubusercontent.com', 'objects.githubusercontent.com']

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function buildJetBrains(config: UnextensionConfig, cwd: string) {
  const distDir = path.resolve(cwd, config.distDir || './dist')
  const outDir = path.resolve(cwd, 'output/jetbrains')
  const resourcesDir = path.join(outDir, 'src/main/resources')

  const jb = config.jetbrains ?? {}
  const gradleVersion = jb.gradleVersion ?? DEFAULT_GRADLE_VERSION
  const kotlinVersion = jb.kotlinVersion ?? DEFAULT_KOTLIN_VERSION
  const intellijPlatformVersion = jb.intellijPlatformVersion ?? DEFAULT_INTELLIJ_PLATFORM_VERSION
  const jvmTarget = jb.jvmTarget ?? DEFAULT_JVM_TARGET
  const ideVersion = jb.ideVersion ?? DEFAULT_IDE_VERSION
  const group = jb.group ?? DEFAULT_GROUP

  const untilBuild = 'untilBuild' in jb ? jb.untilBuild : null
  const untilBuildKotlin = untilBuild
    ? `untilBuild = "${untilBuild}"`
    : `untilBuild = provider { null }`

  if (!await fs.pathExists(distDir)) {
    throw new Error(`distDir not found: ${distDir}\nRun your app's build first.`)
  }

  await fs.ensureDir(resourcesDir)
  await fs.copy(distDir, path.join(resourcesDir, 'webview'))

  const views = config.views ?? []
  const kotlinDir = path.join(outDir, 'src/main/kotlin/com/unextension')
  await fs.ensureDir(kotlinDir)

  // Generate plugin.xml with one toolWindow per view, or the default one if no views configured
  const toolWindowEntries = views.length > 0
    ? views.map(v => {
        const anchor = v.location === 'panel' ? 'bottom' : 'right'
        return `    <toolWindow id="${escapeXml(v.title)}"
                factoryClass="com.unextension.${toPascalCase(v.id)}ToolWindowFactory"
                anchor="${anchor}"
                secondary="false" />`
      }).join('\n')
    : `    <toolWindow id="${escapeXml(config.displayName)}"
                factoryClass="com.unextension.${toPascalCase(config.name)}ToolWindowFactory"
                anchor="right"
                secondary="false" />`

  const pluginXml = `<idea-plugin>
  <id>com.unextension.${escapeXml(config.name)}</id>
  <name>${escapeXml(config.displayName)}</name>
  <version>${escapeXml(config.version)}</version>
  <description>${escapeXml(config.description || '')}</description>
  <vendor>unextension</vendor>

  <depends>com.intellij.modules.platform</depends>

  <extensions defaultExtensionNs="com.intellij">
${toolWindowEntries}
  </extensions>
</idea-plugin>
`

  const metaInfDir = path.join(resourcesDir, 'META-INF')
  await fs.ensureDir(metaInfDir)
  await fs.writeFile(path.join(metaInfDir, 'plugin.xml'), pluginXml)

  // Plugin icon (shown in Settings → Plugins list)
  const iconDestSvg = path.join(metaInfDir, 'pluginIcon.svg')
  if (config.icon) {
    const iconSrc = path.resolve(cwd, config.icon)
    if (await fs.pathExists(iconSrc)) {
      await fs.copy(iconSrc, iconDestSvg)
    } else {
      await fs.writeFile(iconDestSvg, defaultPluginIconSvg(config.displayName))
    }
  } else {
    await fs.writeFile(iconDestSvg, defaultPluginIconSvg(config.displayName))
  }

  // Generate one ToolWindowFactory per view (or the default one)
  if (views.length > 0) {
    for (const view of views) {
      const kt = generateToolWindowFactory(toPascalCase(view.id), view.route.replace(/\/\*$/, ''), !!config.jetbrains?._devMode)
      await fs.writeFile(path.join(kotlinDir, `${toPascalCase(view.id)}ToolWindowFactory.kt`), kt)
    }
  } else {
    const className = toPascalCase(config.name)
    const kt = generateToolWindowFactory(className, '/', !!config.jetbrains?._devMode)
    await fs.writeFile(path.join(kotlinDir, `${className}ToolWindowFactory.kt`), kt)
  }

  const buildGradle = `import org.jetbrains.intellij.platform.gradle.TestFrameworkType

plugins {
    id("org.jetbrains.kotlin.jvm") version "${kotlinVersion}"
    id("org.jetbrains.intellij.platform") version "${intellijPlatformVersion}"
}

group = "${group}"
version = "${config.version}"

kotlin {
    jvmToolchain(${jvmTarget})
}

repositories {
    mavenCentral()
    intellijPlatform { defaultRepositories() }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
    implementation("org.json:json:20240303")

    intellijPlatform {
        intellijIdeaCommunity("${ideVersion}")
        testFramework(TestFrameworkType.Platform)
    }
}

intellijPlatform {
    pluginConfiguration {
        ideaVersion {
            ${untilBuildKotlin}
        }
    }
}
`

  await fs.writeFile(path.join(outDir, 'build.gradle.kts'), buildGradle)

  await generateGradleWrapper(outDir, jb.downloadGradleWrapper ?? true, gradleVersion)

  console.log(`  ✓ JetBrains plugin  → output/jetbrains/`)
}

async function generateGradleWrapper(outDir: string, downloadJar: boolean, gradleVersion: string) {
  const wrapperDir = path.join(outDir, 'gradle', 'wrapper')
  await fs.ensureDir(wrapperDir)

  await fs.writeFile(
    path.join(wrapperDir, 'gradle-wrapper.properties'),
    `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-${gradleVersion}-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`,
  )

  // gradlew (Unix shell script) - official Gradle wrapper script
  const gradlewScript = `#!/usr/bin/env sh
APP_NAME="Gradle"
APP_BASE_NAME=\$(basename "\$0")
APP_HOME=\$(cd "\$(dirname "\$0")" && pwd)
CLASSPATH=\$APP_HOME/gradle/wrapper/gradle-wrapper.jar
exec java -classpath "\$CLASSPATH" org.gradle.wrapper.GradleWrapperMain "\$@"
`
  await fs.writeFile(path.join(outDir, 'gradlew'), gradlewScript, { mode: 0o755 })

  // gradlew.bat (Windows) - %~dp0 already ends with backslash
  const gradlewBat = `@rem Gradle startup script for Windows
@if "%DEBUG%"=="" @echo off
set APP_HOME=%~dp0
set CLASSPATH=%APP_HOME%gradle\\wrapper\\gradle-wrapper.jar
java -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
`
  await fs.writeFile(path.join(outDir, 'gradlew.bat'), gradlewBat)

  // Download gradle-wrapper.jar if not already present (or if it's invalid)
  const jarPath = path.join(wrapperDir, 'gradle-wrapper.jar')
  const jarExists = await fs.pathExists(jarPath)
  const jarValid = jarExists && (await fs.stat(jarPath)).size > 10_000
  if (!GRADLE_VERSION_RE.test(gradleVersion)) {
    throw new Error(`Invalid gradleVersion: ${gradleVersion}`)
  }
  const jarUrl = `https://raw.githubusercontent.com/gradle/gradle/v${gradleVersion}.0/gradle/wrapper/gradle-wrapper.jar`

  if (downloadJar && !jarValid) {
    if (jarExists) await fs.remove(jarPath)
    console.log(`  ⬇️  Downloading gradle-wrapper.jar...`)
    await downloadFile(jarUrl, jarPath)
  } else if (!downloadJar) {
    console.log(`  ⚠️  Skipping gradle-wrapper.jar download (downloadGradleWrapper: false)`)
  }
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const follow = (u: string, redirects = 0) => {
      if (redirects > 5) {
        reject(new Error('Too many redirects downloading gradle-wrapper.jar'))
        return
      }
      https.get(u, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          res.resume()
          const next = res.headers.location
          let nextHost: string
          try {
            nextHost = new URL(next).hostname
          } catch {
            reject(new Error(`Invalid redirect URL: ${next}`))
            return
          }
          if (!ALLOWED_REDIRECT_HOSTS.includes(nextHost)) {
            reject(new Error(`Redirect to disallowed host: ${nextHost}`))
            return
          }
          follow(next, redirects + 1)
          return
        }
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`Failed to download gradle-wrapper.jar: HTTP ${res.statusCode}`))
          return
        }
        const file = fs.createWriteStream(dest)
        res.pipe(file)
        file.on('finish', () => file.close(() => resolve()))
        file.on('error', (err) => {
          res.destroy()
          fs.remove(dest).then(() => reject(err))
        })
      }).on('error', reject)
    }
    follow(url)
  })
}

function generateToolWindowFactory(className: string, route: string, devMode: boolean): string {
  const routeRelative = route === '/' || route === '' ? '' : route.replace(/^\//, '')
  const classNameLower = className.toLowerCase()

  return `package com.unextension

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

        // Wire up JS→Java bridge so window.__unextension_jb_bridge(msg) posts to the IDE
        jsQuery.addHandler { msg ->
            println("[unextension] message from webview (${classNameLower}): \$msg")
            try {
                val parsed = org.json.JSONObject(msg)
                val type = parsed.optString("type", "unknown")
                val payload = parsed.optJSONObject("payload")
                val reply = org.json.JSONObject()

                if (type == "run-command" && payload != null) {
                    val command = payload.optString("command", "")
                    val result = runShellCommand(command)
                    reply.put("type", "run-command:reply")
                    val replyPayload = org.json.JSONObject()
                    replyPayload.put("command", command)
                    replyPayload.put("stdout", result.first)
                    replyPayload.put("stderr", result.second)
                    replyPayload.put("exitCode", result.third)
                    reply.put("payload", replyPayload)
                } else {
                    reply.put("type", "\$type:reply")
                    val replyPayload = org.json.JSONObject()
                    replyPayload.put("received", true)
                    replyPayload.put("echo", parsed.opt("payload"))
                    reply.put("payload", replyPayload)
                }

                val replyJson = reply.toString().replace("\\\\", "\\\\\\\\").replace("'", "\\\\'")
                val js = "window.dispatchEvent(new MessageEvent('message', { data: JSON.parse('\$replyJson') }));"
                browser.cefBrowser.executeJavaScript(js, browser.cefBrowser.url, 0)
            } catch (e: Exception) {
                println("[unextension] Failed to handle message: \${e.message}")
            }
            null
        }

        // Inject bridge + IDE theme CSS variables after every page load
        val loadHandler = object : CefLoadHandlerAdapter() {
            override fun onLoadEnd(b: CefBrowser, frame: CefFrame, httpStatusCode: Int) {
                if (!frame.isMain) return

                // Read IDE theme colors from Swing UIManager
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

        // Dispose browser, jsQuery and loadHandler when the tool window is disposed
        com.intellij.openapi.util.Disposer.register(toolWindow.disposable) {
            browser.jbCefClient.removeLoadHandler(loadHandler, browser.cefBrowser)
            jsQuery.dispose()
            browser.dispose()
        }

        ${devMode ? `val panel = javax.swing.JPanel(java.awt.BorderLayout())
        val devToolsBtn = javax.swing.JButton("Open DevTools")
        devToolsBtn.addActionListener { browser.openDevtools() }
        val footer = javax.swing.JPanel(java.awt.FlowLayout(java.awt.FlowLayout.TRAILING, 4, 2))
        footer.add(devToolsBtn)
        panel.add(footer, java.awt.BorderLayout.SOUTH)
        panel.add(browser.component, java.awt.BorderLayout.CENTER)
        contentManager.addContent(contentManager.factory.createContent(panel, "", false))` : 'contentManager.addContent(contentManager.factory.createContent(browser.component, "", false))'}
        
    }

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

    private fun runShellCommand(command: String): Triple<String, String, Int> {
        return try {
            val isWindows = System.getProperty("os.name").lowercase().contains("win")
            val proc = if (isWindows) {
                ProcessBuilder("cmd", "/c", command)
            } else {
                ProcessBuilder("sh", "-c", command)
            }
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

function toPascalCase(str: string): string {
  return str.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase())
}

function defaultPluginIconSvg(title: string): string {
  const letter = (title?.[0] ?? '?').toUpperCase()
  // 40x40 as required by JetBrains plugin guidelines
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="8" fill="#6c71c4"/>
  <text x="20" y="27" text-anchor="middle" font-size="22" font-family="sans-serif" font-weight="bold" fill="#ffffff">${letter}</text>
</svg>`
}

