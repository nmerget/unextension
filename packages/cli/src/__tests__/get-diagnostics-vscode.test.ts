import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property tests for the VS Code getDiagnostics handler.
 *
 * Since the handler is a plain JS file that uses VS Code globals, we extract
 * and test the core logic (severity mapping, position conversion, and path filtering) independently.
 *
 * **Property 2: Path filter returns only matching diagnostics**
 * For any call to getDiagnostics with a `path` option specified, all diagnostics in the
 * returned result SHALL have their `file` field equal to the specified path.
 *
 * **Property 3: VS Code severity mapping correctness**
 * For any VS Code DiagnosticSeverity value, the mapSeverity function SHALL produce
 * exactly one of the four valid severity strings: Error → 'error', Warning → 'warning',
 * Information → 'info', Hint → 'hint'.
 *
 * **Property 4: VS Code position conversion (0-based to 1-based)**
 * For any non-negative integer position value from the VS Code API, the converted
 * position SHALL equal the original value plus 1, ensuring all output positions are >= 1.
 *
 * **Validates: Requirements 5.2, 9.5, 9.6, 2.2, 2.3, 3.1, 3.2**
 */

/**
 * VS Code DiagnosticSeverity enum values (mirrors vscode.DiagnosticSeverity)
 */
const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
} as const

/**
 * Re-implementation of the mapSeverity function from get-diagnostics.js
 * to test in isolation without requiring the VS Code runtime.
 *
 * This mirrors the exact logic from the handler:
 * ```js
 * function mapSeverity(severity) {
 *   switch (severity) {
 *     case vscode.DiagnosticSeverity.Error: return 'error'
 *     case vscode.DiagnosticSeverity.Warning: return 'warning'
 *     case vscode.DiagnosticSeverity.Information: return 'info'
 *     case vscode.DiagnosticSeverity.Hint: return 'hint'
 *     default: return 'info'
 *   }
 * }
 * ```
 */
function mapSeverity(severity: number): 'error' | 'warning' | 'info' | 'hint' {
  switch (severity) {
    case DiagnosticSeverity.Error:
      return 'error'
    case DiagnosticSeverity.Warning:
      return 'warning'
    case DiagnosticSeverity.Information:
      return 'info'
    case DiagnosticSeverity.Hint:
      return 'hint'
    default:
      return 'info'
  }
}

/**
 * Re-implementation of the position conversion logic from get-diagnostics.js.
 *
 * The handler converts 0-based VS Code positions to 1-based:
 * ```js
 * line: diag.range.start.line + 1,
 * column: diag.range.start.character + 1,
 * ```
 */
function convertPosition(zeroBased: number): number {
  return zeroBased + 1
}

const VALID_SEVERITIES = ['error', 'warning', 'info', 'hint'] as const

describe('VS Code getDiagnostics handler — Property Tests', () => {
  describe('Property 3: VS Code severity mapping correctness', () => {
    it('maps Error (0) to "error"', () => {
      expect(mapSeverity(DiagnosticSeverity.Error)).toBe('error')
    })

    it('maps Warning (1) to "warning"', () => {
      expect(mapSeverity(DiagnosticSeverity.Warning)).toBe('warning')
    })

    it('maps Information (2) to "info"', () => {
      expect(mapSeverity(DiagnosticSeverity.Information)).toBe('info')
    })

    it('maps Hint (3) to "hint"', () => {
      expect(mapSeverity(DiagnosticSeverity.Hint)).toBe('hint')
    })

    it('defaults unknown severity values to "info"', () => {
      fc.assert(
        fc.property(
          fc.integer().filter((n) => n < 0 || n > 3),
          (unknownSeverity) => {
            expect(mapSeverity(unknownSeverity)).toBe('info')
          },
        ),
        { numRuns: 100 },
      )
    })

    it('always produces a valid severity string for any DiagnosticSeverity value', () => {
      fc.assert(
        fc.property(fc.constantFrom(0, 1, 2, 3), (severity) => {
          const result = mapSeverity(severity)
          expect(VALID_SEVERITIES).toContain(result)
        }),
        { numRuns: 100 },
      )
    })

    it('produces exactly the correct mapping for each known severity', () => {
      const expectedMapping: Record<number, string> = {
        0: 'error',
        1: 'warning',
        2: 'info',
        3: 'hint',
      }

      fc.assert(
        fc.property(fc.constantFrom(0, 1, 2, 3), (severity) => {
          expect(mapSeverity(severity)).toBe(expectedMapping[severity])
        }),
        { numRuns: 100 },
      )
    })

    it('always returns a valid severity string for any integer input', () => {
      fc.assert(
        fc.property(fc.integer({ min: -1000, max: 1000 }), (severity) => {
          const result = mapSeverity(severity)
          expect(VALID_SEVERITIES).toContain(result)
        }),
        { numRuns: 200 },
      )
    })
  })

  describe('Property 4: VS Code position conversion (0-based to 1-based)', () => {
    it('converts 0 to 1', () => {
      expect(convertPosition(0)).toBe(1)
    })

    it('converts 5 to 6', () => {
      expect(convertPosition(5)).toBe(6)
    })

    it('for any non-negative integer, converted position equals original + 1', () => {
      fc.assert(
        fc.property(fc.nat({ max: 100_000 }), (zeroBased) => {
          const result = convertPosition(zeroBased)
          expect(result).toBe(zeroBased + 1)
        }),
        { numRuns: 200 },
      )
    })

    it('all converted positions are >= 1', () => {
      fc.assert(
        fc.property(fc.nat({ max: 100_000 }), (zeroBased) => {
          const result = convertPosition(zeroBased)
          expect(result).toBeGreaterThanOrEqual(1)
        }),
        { numRuns: 200 },
      )
    })

    it('conversion is strictly monotonically increasing', () => {
      fc.assert(
        fc.property(fc.nat({ max: 100_000 }), fc.nat({ max: 100_000 }), (a, b) => {
          if (a < b) {
            expect(convertPosition(a)).toBeLessThan(convertPosition(b))
          } else if (a > b) {
            expect(convertPosition(a)).toBeGreaterThan(convertPosition(b))
          } else {
            expect(convertPosition(a)).toBe(convertPosition(b))
          }
        }),
        { numRuns: 200 },
      )
    })

    it('conversion preserves relative distances between positions', () => {
      fc.assert(
        fc.property(fc.nat({ max: 100_000 }), fc.nat({ max: 100_000 }), (a, b) => {
          const diff = convertPosition(b) - convertPosition(a)
          expect(diff).toBe(b - a)
        }),
        { numRuns: 200 },
      )
    })
  })

  /**
   * Property 2: Path filter returns only matching diagnostics
   *
   * For any call to getDiagnostics with a `path` option specified, all diagnostics
   * in the returned result SHALL have their `file` field equal to the specified path.
   *
   * **Validates: Requirements 5.2**
   *
   * We re-implement the path filter logic from the VS Code handler:
   * ```js
   * if (filterPath && relativePath !== filterPath) continue
   * ```
   *
   * The test generates random diagnostic arrays with various file paths, applies
   * the filter with a specific path, and verifies all results match.
   */
  describe('Property 2: Path filter returns only matching diagnostics', () => {
    /** Arbitrary for generating a relative file path like "src/foo/bar.ts" */
    const relativePath = fc
      .tuple(
        fc.array(
          fc.string({
            minLength: 1,
            maxLength: 12,
            unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')),
          }),
          { minLength: 1, maxLength: 4 },
        ),
        fc.constantFrom('.ts', '.js', '.tsx', '.jsx', '.json', '.css'),
      )
      .map(([segments, ext]) => segments.join('/') + ext)

    /**
     * Re-implementation of the path filter logic from the VS Code handler.
     * Given a list of diagnostics (each with a `file` field) and a filterPath,
     * returns only those diagnostics whose `file` matches the filterPath.
     */
    function applyPathFilter(
      diagnostics: Array<{
        file: string
        line: number
        column: number
        message: string
        severity: string
      }>,
      filterPath: string | null,
    ) {
      if (!filterPath) return diagnostics
      return diagnostics.filter((d) => d.file === filterPath)
    }

    it('all diagnostics in filtered result have file equal to the specified path', () => {
      fc.assert(
        fc.property(
          relativePath,
          fc.array(relativePath, { minLength: 1, maxLength: 5 }),
          fc.nat({ max: 10 }),
          (filterPathValue, otherPaths, diagsPerFile) => {
            // Build a set of all file paths (including the filter path)
            const allPaths = [filterPathValue, ...otherPaths]

            // Generate diagnostics for each path
            const allDiagnostics = allPaths.flatMap((p) =>
              Array.from({ length: diagsPerFile }, (_, i) => ({
                file: p,
                line: i + 1,
                column: 1,
                message: `Issue ${i}`,
                severity: 'error' as const,
              })),
            )

            // Apply the path filter
            const filtered = applyPathFilter(allDiagnostics, filterPathValue)

            // Property: all diagnostics in the result have file === filterPath
            for (const diag of filtered) {
              expect(diag.file).toBe(filterPathValue)
            }
          },
        ),
        { numRuns: 200 },
      )
    })

    it('path filter with generated diagnostics always returns subset with matching file', () => {
      fc.assert(
        fc.property(
          relativePath,
          fc.array(relativePath, { minLength: 0, maxLength: 8 }),
          (filterPathValue, filePaths) => {
            // Create diagnostics spread across multiple files
            const diagnostics = filePaths.map((fp, i) => ({
              file: fp,
              line: i + 1,
              column: 1,
              message: `Diagnostic ${i}`,
              severity: 'warning' as const,
            }))

            const filtered = applyPathFilter(diagnostics, filterPathValue)

            // Property: every returned diagnostic has file === filterPath
            for (const diag of filtered) {
              expect(diag.file).toBe(filterPathValue)
            }

            // Property: no diagnostics with matching file were excluded
            const expectedCount = diagnostics.filter((d) => d.file === filterPathValue).length
            expect(filtered.length).toBe(expectedCount)
          },
        ),
        { numRuns: 200 },
      )
    })

    it('when filterPath is null, all diagnostics are returned (no filtering)', () => {
      fc.assert(
        fc.property(fc.array(relativePath, { minLength: 0, maxLength: 10 }), (filePaths) => {
          const diagnostics = filePaths.map((fp, i) => ({
            file: fp,
            line: i + 1,
            column: 1,
            message: `Diagnostic ${i}`,
            severity: 'info' as const,
          }))

          const filtered = applyPathFilter(diagnostics, null)

          // Property: no filtering applied, all diagnostics returned
          expect(filtered.length).toBe(diagnostics.length)
        }),
        { numRuns: 100 },
      )
    })

    it('path filter is exact match — partial matches are excluded', () => {
      fc.assert(
        fc.property(relativePath, fc.string({ minLength: 1, maxLength: 5 }), (basePath, suffix) => {
          // Create a path that is a prefix/suffix variation of the filter path
          const longerPath = basePath + suffix
          // Ensure they are actually different
          fc.pre(longerPath !== basePath)

          const diagnostics = [
            { file: basePath, line: 1, column: 1, message: 'exact', severity: 'error' as const },
            {
              file: longerPath,
              line: 2,
              column: 1,
              message: 'longer',
              severity: 'warning' as const,
            },
          ]

          const filtered = applyPathFilter(diagnostics, basePath)

          // Property: only exact match is included
          for (const diag of filtered) {
            expect(diag.file).toBe(basePath)
          }
          // The longer path should not be included
          expect(filtered.every((d) => d.file === basePath)).toBe(true)
        }),
        { numRuns: 200 },
      )
    })
  })
})
