import path from 'node:path'
import https from 'node:https'
import fs from 'fs-extra'
import type { UnextensionConfig } from '../../config.js'
import { toPascalCase, escapeXml, defaultPluginIconSvg, defaultToolbarIconSvg } from '../shared.js'
import { generateToolWindowFactory } from './toolwindow.js'
import { generateEditorAction } from './editor-action.js'
import { generateAppSettingsState, generateProjectSettingsState } from './settings-state.js'
import {
  generateSettingsConfigurable,
  generateWebviewBrowserRegistry,
} from './settings-configurable.js'

const DEFAULT_GRADLE_VERSION = '8.7'
const DEFAULT_KOTLIN_VERSION = '2.1.0'
const DEFAULT_INTELLIJ_PLATFORM_VERSION = '2.2.1'
const DEFAULT_JVM_TARGET = 21
const DEFAULT_IDE_VERSION = '2024.3'
const DEFAULT_GROUP = 'com.unextension'
const GRADLE_VERSION_RE = /^\d+\.\d+(\.\d+)?$/
const ALLOWED_REDIRECT_HOSTS = ['raw.githubusercontent.com', 'objects.githubusercontent.com']

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

  if (!(await fs.pathExists(distDir))) {
    throw new Error(`distDir not found: ${distDir}\nRun your app's build first.`)
  }

  await fs.ensureDir(resourcesDir)
  await fs.copy(distDir, path.join(resourcesDir, 'webview'))

  if (config.scriptsDir) {
    const scriptsDir = path.resolve(cwd, config.scriptsDir)
    if (await fs.pathExists(scriptsDir)) {
      await fs.copy(scriptsDir, path.join(resourcesDir, 'scripts'))
    }
  }

  const views = config.views ?? []
  const kotlinDir = path.join(outDir, 'src/main/kotlin/com/unextension')
  await fs.ensureDir(kotlinDir)

  const toolWindowViews = views.filter((v) => (v.location ?? 'sidebar') !== 'toolbar')
  const editorTabViews = views.filter((v) => v.location === 'toolbar')

  const toolWindowEntries =
    toolWindowViews.length > 0
      ? toolWindowViews
          .map((v) => {
            const anchor = v.location === 'panel' ? 'bottom' : 'right'
            return `    <toolWindow id="${escapeXml(v.title)}"
                factoryClass="com.unextension.${toPascalCase(v.id)}ToolWindowFactory"
                anchor="${anchor}"
                icon="/icons/${v.id}.svg"
                secondary="false" />`
          })
          .join('\n')
      : views.length === 0
        ? `    <toolWindow id="${escapeXml(config.displayName)}"
                factoryClass="com.unextension.${toPascalCase(config.name)}ToolWindowFactory"
                anchor="right"
                icon="/META-INF/pluginIcon.svg"
                secondary="false" />`
        : ''

  // Generate settings registration entries for plugin.xml
  let settingsEntries = ''
  if (config.settings && config.settings.length > 0) {
    const globalSettings = config.settings.filter((s) => (s.scope ?? 'global') === 'global')
    const workspaceSettings = config.settings.filter((s) => s.scope === 'workspace')
    const entries: string[] = []

    if (globalSettings.length > 0) {
      entries.push(
        `    <applicationService serviceImplementation="com.unextension.AppSettingsState" />`,
      )
    }
    if (workspaceSettings.length > 0) {
      entries.push(
        `    <projectService serviceImplementation="com.unextension.ProjectSettingsState" />`,
      )
      entries.push(`    <projectConfigurable instance="com.unextension.SettingsConfigurable"
                    id="com.unextension.settings"
                    displayName="${escapeXml(config.displayName)}"
                    parentId="tools" />`)
    } else {
      entries.push(`    <applicationConfigurable instance="com.unextension.SettingsConfigurable"
                    id="com.unextension.settings"
                    displayName="${escapeXml(config.displayName)}"
                    parentId="tools" />`)
    }
    settingsEntries = '\n' + entries.join('\n')
  }

  const pluginXml = `<idea-plugin>
  <id>com.unextension.${escapeXml(config.name)}</id>
  <name>${escapeXml(config.displayName)}</name>
  <version>${escapeXml(config.version)}</version>
  <description>${escapeXml(config.description || '')}</description>
  <vendor>unextension</vendor>

  <depends>com.intellij.modules.platform</depends>

  <extensions defaultExtensionNs="com.intellij">
    <notificationGroup id="unextension" displayType="BALLOON" />
${toolWindowEntries}${editorTabViews.length > 0 ? '\n' + editorTabViews.map((v) => `    <fileEditorProvider implementation="com.unextension.${toPascalCase(v.id)}EditorProvider" />`).join('\n') : ''}${settingsEntries}
  </extensions>
${editorTabViews.length > 0 ? `\n  <actions>\n    <group id="com.unextension.actions" text="${escapeXml(config.displayName)}" popup="true">\n      <add-to-group group-id="ToolsMenu" anchor="last" />\n${editorTabViews.map((v) => `      <action id="com.unextension.open.${v.id}" class="com.unextension.${toPascalCase(v.id)}EditorAction" text="Open ${escapeXml(v.title)}" description="Open ${escapeXml(v.title)} in editor tab" icon="/icons/${v.id}.svg" />`).join('\n')}\n    </group>\n${editorTabViews.map((v) => `    <action id="com.unextension.toolbar.${v.id}" class="com.unextension.${toPascalCase(v.id)}EditorAction" text="${escapeXml(v.title)}" description="Open ${escapeXml(v.title)}" icon="/icons/${v.id}.svg">\n      <add-to-group group-id="MainToolbarRight" anchor="last" />\n    </action>`).join('\n')}\n  </actions>\n` : ''}
</idea-plugin>
`

  const metaInfDir = path.join(resourcesDir, 'META-INF')
  await fs.ensureDir(metaInfDir)
  await fs.writeFile(path.join(metaInfDir, 'plugin.xml'), pluginXml)

  const iconDestSvg = path.join(metaInfDir, 'pluginIcon.svg')
  if (config.icon) {
    const iconSrc = path.resolve(cwd, config.icon)
    await fs.writeFile(
      iconDestSvg,
      (await fs.pathExists(iconSrc))
        ? await fs.readFile(iconSrc, 'utf8')
        : defaultPluginIconSvg(config.displayName),
    )
  } else {
    await fs.writeFile(iconDestSvg, defaultPluginIconSvg(config.displayName))
  }

  // Copy view icons to resources/icons/ for toolbar actions (scaled to 16x16 for JetBrains)
  const iconsResDir = path.join(resourcesDir, 'icons')
  await fs.ensureDir(iconsResDir)
  for (const view of views) {
    if (view.icon) {
      const iconSrc = path.resolve(cwd, view.icon)
      if (await fs.pathExists(iconSrc)) {
        let svg = await fs.readFile(iconSrc, 'utf8')
        // Scale SVG to 16x16 for JetBrains toolbar/tool window icons
        svg = svg.replace(/(<svg[^>]*?)(\s+width=["'][^"']*["'])/i, '$1 width="16"')
        svg = svg.replace(/(<svg[^>]*?)(\s+height=["'][^"']*["'])/i, '$1 height="16"')
        // Add width/height if not present
        if (!/width=/i.test(svg)) {
          svg = svg.replace('<svg', '<svg width="16" height="16"')
        }
        await fs.writeFile(path.join(iconsResDir, `${view.id}.svg`), svg)
        continue
      }
    }
    await fs.writeFile(path.join(iconsResDir, `${view.id}.svg`), defaultToolbarIconSvg(view.title))
  }

  const devMode = !!config.jetbrains?._devMode
  const hasSettings = !!(config.settings && config.settings.length > 0)
  if (toolWindowViews.length > 0) {
    for (const view of toolWindowViews) {
      const kt = generateToolWindowFactory(
        toPascalCase(view.id),
        view.route.replace(/\/\*$/, ''),
        devMode,
        config.commands?.allow,
        hasSettings,
      )
      await fs.writeFile(path.join(kotlinDir, `${toPascalCase(view.id)}ToolWindowFactory.kt`), kt)
    }
  } else if (views.length === 0) {
    const className = toPascalCase(config.name)
    await fs.writeFile(
      path.join(kotlinDir, `${className}ToolWindowFactory.kt`),
      generateToolWindowFactory(className, '/', devMode, config.commands?.allow, hasSettings),
    )
  }

  // Generate editor tab actions for editorTab views
  for (const view of editorTabViews) {
    const kt = generateEditorAction(
      toPascalCase(view.id),
      view.title,
      view.route.replace(/\/\*$/, ''),
      devMode,
      config.commands?.allow,
      hasSettings,
    )
    await fs.writeFile(path.join(kotlinDir, `${toPascalCase(view.id)}EditorAction.kt`), kt)
  }

  // Generate settings state files if settings are defined
  if (config.settings && config.settings.length > 0) {
    const globalSettings = config.settings.filter((s) => (s.scope ?? 'global') === 'global')
    const workspaceSettings = config.settings.filter((s) => s.scope === 'workspace')

    if (globalSettings.length > 0) {
      await fs.writeFile(
        path.join(kotlinDir, 'AppSettingsState.kt'),
        generateAppSettingsState(config.settings),
      )
    }

    if (workspaceSettings.length > 0) {
      await fs.writeFile(
        path.join(kotlinDir, 'ProjectSettingsState.kt'),
        generateProjectSettingsState(config.settings),
      )
    }

    await fs.writeFile(
      path.join(kotlinDir, 'SettingsConfigurable.kt'),
      generateSettingsConfigurable(config),
    )

    await fs.writeFile(
      path.join(kotlinDir, 'WebviewBrowserRegistry.kt'),
      generateWebviewBrowserRegistry(),
    )
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
    `distributionBase=GRADLE_USER_HOME\ndistributionPath=wrapper/dists\ndistributionUrl=https\\://services.gradle.org/distributions/gradle-${gradleVersion}-bin.zip\nzipStoreBase=GRADLE_USER_HOME\nzipStorePath=wrapper/dists\n`,
  )

  await fs.writeFile(
    path.join(outDir, 'gradlew'),
    `#!/usr/bin/env sh\nAPP_NAME="Gradle"\nAPP_BASE_NAME=$(basename "$0")\nAPP_HOME=$(cd "$(dirname "$0")" && pwd)\nCLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar\nexec java -classpath "$CLASSPATH" org.gradle.wrapper.GradleWrapperMain "$@"\n`,
    { mode: 0o755 },
  )

  await fs.writeFile(
    path.join(outDir, 'gradlew.bat'),
    `@rem Gradle startup script for Windows\n@if "%DEBUG%"=="" @echo off\nset APP_HOME=%~dp0\nset CLASSPATH=%APP_HOME%gradle\\wrapper\\gradle-wrapper.jar\njava -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*\n`,
  )

  const jarPath = path.join(wrapperDir, 'gradle-wrapper.jar')
  const jarValid = (await fs.pathExists(jarPath)) && (await fs.stat(jarPath)).size > 10_000
  if (!GRADLE_VERSION_RE.test(gradleVersion))
    throw new Error(`Invalid gradleVersion: ${gradleVersion}`)

  if (downloadJar && !jarValid) {
    if (await fs.pathExists(jarPath)) await fs.remove(jarPath)
    console.log(`  ⬇️  Downloading gradle-wrapper.jar...`)
    await downloadFile(
      `https://raw.githubusercontent.com/gradle/gradle/v${gradleVersion}.0/gradle/wrapper/gradle-wrapper.jar`,
      jarPath,
    )
  } else if (!downloadJar) {
    console.log(`  ⚠️  Skipping gradle-wrapper.jar download (downloadGradleWrapper: false)`)
  }
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const follow = (u: string, redirects = 0) => {
      if (redirects > 5) {
        reject(new Error('Too many redirects'))
        return
      }
      https
        .get(u, (res) => {
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
            reject(new Error(`HTTP ${res.statusCode}`))
            return
          }
          const file = fs.createWriteStream(dest)
          res.pipe(file)
          file.on('finish', () => file.close(() => resolve()))
          file.on('error', (err) => {
            res.destroy()
            fs.remove(dest).then(() => reject(err))
          })
        })
        .on('error', reject)
    }
    follow(url)
  })
}
