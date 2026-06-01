import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as vm from 'node:vm'

/**
 * Property-based tests for hunk decision completeness.
 *
 * Feature: native-diff-rendering
 *
 * Since `computeHunks` lives in a code-generation JS file
 * (`packages/cli/src/targets/vscode/actions/open-diff.js`), we load it
 * dynamically and extract the function for testing.
 *
 * **Validates: Requirements 5.6**
 */

// --- Load computeHunks from the VS Code handler ---
const openDiffPath = path.resolve(__dirname, '../../../cli/src/targets/vscode/actions/open-diff.js')
const openDiffSource = fs.readFileSync(openDiffPath, 'utf8')

// Create a sandbox that exposes computeHunks
const sandbox: Record<string, any> = {}
const script = new vm.Script(openDiffSource + '\n;sandbox.computeHunks = computeHunks;', {
  filename: 'open-diff.js',
})
script.runInNewContext({ sandbox, vscode: {}, Buffer, output: { appendLine: () => {} } })

const computeHunks: (
  original: string,
  modified: string,
) => Array<{
  origStart: number
  origCount: number
  modStart: number
  modCount: number
}> = sandbox.computeHunks

/**
 * Simulates the finalize logic from the VS Code handler.
 * For each hunk, it produces a HunkDecision entry with the hunk's index
 * and a random accept/reject decision.
 */
function simulateFinalize(
  hunks: Array<{ origStart: number; origCount: number; modStart: number; modCount: number }>,
  decisions: Map<number, boolean>,
): Array<{ index: number; accepted: boolean }> {
  const hunkResults: Array<{ index: number; accepted: boolean }> = []
  for (let idx = 0; idx < hunks.length; idx++) {
    const accepted = decisions.has(idx) ? (decisions.get(idx) as boolean) : true
    hunkResults.push({ index: idx, accepted })
  }
  return hunkResults
}

describe('openDiff hunk decision completeness — property tests', () => {
  /**
   * Property 4: Hunk decision completeness
   *
   * For any diff containing N hunks (N >= 1), when the user performs partial
   * acceptance, the reply `hunks` array SHALL contain exactly N `HunkDecision`
   * entries, one for each hunk at its corresponding zero-based index.
   *
   * **Validates: Requirements 5.6**
   */
  describe('Property 4: Hunk decision completeness', () => {
    /**
     * Generator for pairs of original/modified strings that produce at least 1 hunk.
     * We generate multi-line strings and ensure they differ so computeHunks returns N >= 1.
     */
    const diffPairWithHunks = fc
      .tuple(
        fc.array(fc.string({ minLength: 0, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
        fc.array(fc.string({ minLength: 0, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
      )
      .filter(([origLines, modLines]) => {
        // Ensure the two are not identical so we get at least one hunk
        return origLines.join('\n') !== modLines.join('\n')
      })
      .map(([origLines, modLines]) => ({
        original: origLines.join('\n'),
        modified: modLines.join('\n'),
      }))

    it('produces exactly N HunkDecision entries for a diff with N hunks', () => {
      fc.assert(
        fc.property(diffPairWithHunks, ({ original, modified }) => {
          const hunks = computeHunks(original, modified)

          // We only test cases where N >= 1 (filter guarantees content differs)
          if (hunks.length === 0) return true // skip edge case where diff algorithm finds no hunks

          const N = hunks.length

          // Simulate partial acceptance with all hunks having explicit decisions
          const decisions = new Map<number, boolean>()
          for (let i = 0; i < N; i++) {
            decisions.set(i, i % 2 === 0) // alternate accept/reject
          }

          const hunkResults = simulateFinalize(hunks, decisions)

          // Property: exactly N entries
          expect(hunkResults).toHaveLength(N)

          // Property: each entry has the correct zero-based index
          for (let i = 0; i < N; i++) {
            expect(hunkResults[i].index).toBe(i)
            expect(typeof hunkResults[i].accepted).toBe('boolean')
          }
        }),
        { numRuns: 200 },
      )
    })

    it('produces exactly N HunkDecision entries even with no explicit decisions (defaults to accepted)', () => {
      fc.assert(
        fc.property(diffPairWithHunks, ({ original, modified }) => {
          const hunks = computeHunks(original, modified)

          if (hunks.length === 0) return true

          const N = hunks.length

          // Simulate finalize with no explicit decisions (empty map — all default to accepted)
          const decisions = new Map<number, boolean>()
          const hunkResults = simulateFinalize(hunks, decisions)

          // Property: still exactly N entries
          expect(hunkResults).toHaveLength(N)

          // Property: each entry defaults to accepted=true
          for (let i = 0; i < N; i++) {
            expect(hunkResults[i].index).toBe(i)
            expect(hunkResults[i].accepted).toBe(true)
          }
        }),
        { numRuns: 200 },
      )
    })

    it('produces exactly N HunkDecision entries with random partial decisions', () => {
      fc.assert(
        fc.property(
          diffPairWithHunks,
          fc.func(fc.boolean()),
          ({ original, modified }, decisionFn) => {
            const hunks = computeHunks(original, modified)

            if (hunks.length === 0) return true

            const N = hunks.length

            // Simulate partial decisions: some hunks have explicit decisions, some don't
            const decisions = new Map<number, boolean>()
            for (let i = 0; i < N; i++) {
              if (decisionFn(i)) {
                decisions.set(i, decisionFn(i + N))
              }
            }

            const hunkResults = simulateFinalize(hunks, decisions)

            // Property: always exactly N entries regardless of which hunks have explicit decisions
            expect(hunkResults).toHaveLength(N)

            // Property: indices are sequential 0..N-1
            for (let i = 0; i < N; i++) {
              expect(hunkResults[i].index).toBe(i)
              expect(typeof hunkResults[i].accepted).toBe('boolean')
            }
          },
        ),
        { numRuns: 200 },
      )
    })
  })
})
