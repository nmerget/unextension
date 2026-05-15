import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property-based tests for JetBrains severity mapping correctness.
 *
 * Since the JetBrains handler is written in Kotlin and cannot be directly
 * tested in this TypeScript monorepo, we reimplement the mapping logic
 * in TypeScript and validate it with property-based tests.
 *
 * The IntelliJ `HighlightSeverity` class uses integer-based comparison.
 * Known severity levels (from IntelliJ source):
 *   - ERROR = 400
 *   - WARNING = 300
 *   - WEAK_WARNING = 200
 *   - GENERIC_SERVER_ERROR_OR_WARNING = 100
 *   - INFORMATION = 10
 *   - TEXT_ATTRIBUTES = 1
 *
 * The Kotlin `mapSeverity` function uses threshold comparison:
 *   severity >= ERROR       → 'error'
 *   severity >= WARNING     → 'warning'
 *   severity >= WEAK_WARNING → 'info'
 *   else                    → 'hint'
 *
 * **Validates: Requirements 10.4**
 */

// IntelliJ HighlightSeverity threshold constants
const HIGHLIGHT_SEVERITY = {
  ERROR: 400,
  WARNING: 300,
  WEAK_WARNING: 200,
  INFORMATION: 10,
  TEXT_ATTRIBUTES: 1,
} as const

type Severity = 'error' | 'warning' | 'info' | 'hint'

const VALID_SEVERITIES: readonly Severity[] = ['error', 'warning', 'info', 'hint']

/**
 * TypeScript reimplementation of the Kotlin `mapSeverity` function
 * from `GetDiagnostics.kt`. Uses the same threshold-based logic:
 *
 * ```kotlin
 * fun mapSeverity(severity: HighlightSeverity): String {
 *     return when {
 *         severity >= HighlightSeverity.ERROR -> "error"
 *         severity >= HighlightSeverity.WARNING -> "warning"
 *         severity >= HighlightSeverity.WEAK_WARNING -> "info"
 *         else -> "hint"
 *     }
 * }
 * ```
 */
function mapSeverity(severityValue: number): Severity {
  if (severityValue >= HIGHLIGHT_SEVERITY.ERROR) return 'error'
  if (severityValue >= HIGHLIGHT_SEVERITY.WARNING) return 'warning'
  if (severityValue >= HIGHLIGHT_SEVERITY.WEAK_WARNING) return 'info'
  return 'hint'
}

describe('JetBrains severity mapping — property tests', () => {
  /**
   * Property 5: JetBrains severity mapping correctness
   *
   * For any IntelliJ `HighlightSeverity` value, the `mapSeverity` function
   * SHALL produce exactly one of the four valid severity strings:
   * `'error'`, `'warning'`, `'info'`, or `'hint'`.
   *
   * **Validates: Requirements 10.4**
   */
  describe('Property 5: JetBrains severity mapping correctness', () => {
    it('maps any integer severity value to exactly one of the four valid severity strings', () => {
      fc.assert(
        fc.property(fc.integer({ min: -1000, max: 1000 }), (severityValue) => {
          const result = mapSeverity(severityValue)
          expect(VALID_SEVERITIES).toContain(result)
        }),
        { numRuns: 500 },
      )
    })

    it('maps severity values at and above ERROR threshold to "error"', () => {
      fc.assert(
        fc.property(fc.integer({ min: HIGHLIGHT_SEVERITY.ERROR, max: 1000 }), (severityValue) => {
          expect(mapSeverity(severityValue)).toBe('error')
        }),
        { numRuns: 100 },
      )
    })

    it('maps severity values in [WARNING, ERROR) range to "warning"', () => {
      fc.assert(
        fc.property(
          fc.integer({
            min: HIGHLIGHT_SEVERITY.WARNING,
            max: HIGHLIGHT_SEVERITY.ERROR - 1,
          }),
          (severityValue) => {
            expect(mapSeverity(severityValue)).toBe('warning')
          },
        ),
        { numRuns: 100 },
      )
    })

    it('maps severity values in [WEAK_WARNING, WARNING) range to "info"', () => {
      fc.assert(
        fc.property(
          fc.integer({
            min: HIGHLIGHT_SEVERITY.WEAK_WARNING,
            max: HIGHLIGHT_SEVERITY.WARNING - 1,
          }),
          (severityValue) => {
            expect(mapSeverity(severityValue)).toBe('info')
          },
        ),
        { numRuns: 100 },
      )
    })

    it('maps severity values below WEAK_WARNING to "hint"', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: HIGHLIGHT_SEVERITY.WEAK_WARNING - 1 }),
          (severityValue) => {
            expect(mapSeverity(severityValue)).toBe('hint')
          },
        ),
        { numRuns: 100 },
      )
    })

    it('correctly maps exact threshold boundary values', () => {
      // Exact boundary values
      expect(mapSeverity(HIGHLIGHT_SEVERITY.ERROR)).toBe('error')
      expect(mapSeverity(HIGHLIGHT_SEVERITY.WARNING)).toBe('warning')
      expect(mapSeverity(HIGHLIGHT_SEVERITY.WEAK_WARNING)).toBe('info')

      // One below each threshold
      expect(mapSeverity(HIGHLIGHT_SEVERITY.ERROR - 1)).toBe('warning')
      expect(mapSeverity(HIGHLIGHT_SEVERITY.WARNING - 1)).toBe('info')
      expect(mapSeverity(HIGHLIGHT_SEVERITY.WEAK_WARNING - 1)).toBe('hint')

      // One above each threshold
      expect(mapSeverity(HIGHLIGHT_SEVERITY.ERROR + 1)).toBe('error')
      expect(mapSeverity(HIGHLIGHT_SEVERITY.WARNING + 1)).toBe('warning')
      expect(mapSeverity(HIGHLIGHT_SEVERITY.WEAK_WARNING + 1)).toBe('info')
    })

    it('maps known IntelliJ severity constants correctly', () => {
      // Known IntelliJ HighlightSeverity constants
      expect(mapSeverity(400)).toBe('error') // ERROR
      expect(mapSeverity(300)).toBe('warning') // WARNING
      expect(mapSeverity(200)).toBe('info') // WEAK_WARNING
      expect(mapSeverity(100)).toBe('hint') // GENERIC_SERVER_ERROR_OR_WARNING (below WEAK_WARNING)
      expect(mapSeverity(10)).toBe('hint') // INFORMATION
      expect(mapSeverity(1)).toBe('hint') // TEXT_ATTRIBUTES
    })
  })
})
