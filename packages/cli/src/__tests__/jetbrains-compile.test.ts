import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const showcaseJetbrainsDir = join(root, '..', 'showcase', 'output', 'jetbrains')

/**
 * Integration test that verifies the generated JetBrains plugin compiles successfully.
 *
 * This test runs `gradlew compileKotlin` on the generated showcase plugin output
 * to ensure all generated Kotlin code (including spawn-process actions with
 * jbProcessRegistry, postStreamEvent, etc.) compiles without errors.
 *
 * Prerequisites:
 * - Java 21+ must be available on PATH
 * - The showcase must have been built (`pnpm --filter @unextension/showcase build`)
 *
 * This test is skipped if the JetBrains output directory doesn't exist or Java is not available.
 */
describe('JetBrains plugin compilation', () => {
  const hasJetbrainsOutput = existsSync(join(showcaseJetbrainsDir, 'build.gradle.kts'))

  const hasJava = (() => {
    try {
      execSync('java -version', { stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  })()

  const canRun = hasJetbrainsOutput && hasJava

  it('generated Kotlin code compiles without errors', { skip: !canRun, timeout: 180_000 }, () => {
    const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'

    const result = execSync(`${gradlew} compileKotlin --no-daemon`, {
      cwd: showcaseJetbrainsDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 180_000,
    })

    // If we get here without throwing, compilation succeeded
    expect(result).toContain('BUILD SUCCESSFUL')
  })

  it('generated plugin builds a JAR successfully', { skip: !canRun, timeout: 300_000 }, () => {
    const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'

    const result = execSync(`${gradlew} buildPlugin --no-daemon`, {
      cwd: showcaseJetbrainsDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 300_000,
    })

    expect(result).toContain('BUILD SUCCESSFUL')

    // Verify the plugin distribution was created
    const buildDistDir = join(showcaseJetbrainsDir, 'build', 'distributions')
    expect(existsSync(buildDistDir)).toBe(true)
  })
})
