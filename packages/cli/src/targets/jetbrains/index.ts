import path from 'node:path'
import https from 'node:https'
import fs from 'fs-extra'
import type { UnextensionConfig } from '../../config.js'
import { toPascalCase, escapeXml, defaultPluginIconSvg } from '../shared.js'
import { generateToolWindowFactory } from './toolwindow.js'

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

  const toolWindowEntries =
    views.length > 0
      ? views
          .map((v) => {
            const anchor = v.location === 'panel' ? 'bottom' : 'right'
            return `    <toolWindow id="${escapeXml(v.title)}"
                factoryClass="com.unextension.${toPascalCase(v.id)}ToolWindowFactory"
                anchor="${anchor}"
                secondary="false" />`
          })
          .join('\n')
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
    <notificationGroup id="unextension" displayType="BALLOON" />
${toolWindowEntries}
  </extensions>
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

  const devMode = !!config.jetbrains?._devMode
  if (views.length > 0) {
    for (const view of views) {
      const kt = generateToolWindowFactory(
        toPascalCase(view.id),
        view.route.replace(/\/\*$/, ''),
        devMode,
      )
      await fs.writeFile(path.join(kotlinDir, `${toPascalCase(view.id)}ToolWindowFactory.kt`), kt)
    }
  } else {
    const className = toPascalCase(config.name)
    await fs.writeFile(
      path.join(kotlinDir, `${className}ToolWindowFactory.kt`),
      generateToolWindowFactory(className, '/', devMode),
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
