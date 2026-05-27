import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { isCommandAllowed, matchCommandPattern } from '../targets/shared-allowlist.js'

/**
 * Property-based tests for allowlist matching logic.
 *
 * Feature: execute-command-action
 */
describe('Allowlist matching — property tests', () => {
  /**
   * Helper: generate a dot-separated command ID segment (one or more non-dot chars).
   * Uses stringMatching to produce segments of lowercase letters (a-z) with length 1-8.
   */
  const segmentArb = fc.stringMatching(/^[a-z]{1,8}$/)

  /**
   * Helper: generate a dot-separated command ID with 1-5 segments.
   */
  const commandIdArb = fc
    .array(segmentArb, { minLength: 1, maxLength: 5 })
    .map((segments) => segments.join('.'))

  /**
   * Helper: generate a pattern that is either an exact command ID or a glob pattern
   * (some segments replaced with *).
   */
  const patternArb = fc
    .array(fc.oneof(segmentArb, fc.constant('*')), { minLength: 1, maxLength: 5 })
    .map((segments) => segments.join('.'))

  /**
   * Helper: generate an allowlist (array of patterns).
   */
  const allowlistArb = fc.array(patternArb, { minLength: 0, maxLength: 5 })

  /**
   * Reference implementation for matching a command against a pattern.
   * Used to verify the actual implementation.
   */
  function referenceMatch(command: string, pattern: string): boolean {
    if (!pattern.includes('*')) return command === pattern
    const commandSegments = command.split('.')
    const patternSegments = pattern.split('.')
    if (commandSegments.length !== patternSegments.length) return false
    return patternSegments.every((pSeg, i) => {
      if (pSeg === '*') return commandSegments[i].length > 0 && !commandSegments[i].includes('.')
      return pSeg === commandSegments[i]
    })
  }

  /**
   * Property 3: Allowlist matching — exact and glob
   *
   * For any command ID and any allowlist of patterns, `isCommandAllowed` returns
   * true if and only if at least one pattern matches (exact equality or glob match
   * with * matching [^.]+ within a single segment).
   *
   * **Validates: Requirements 2.3, 3.1, 3.2, 3.3, 3.4**
   */
  describe('Property 3: Allowlist matching — exact and glob', () => {
    it('isCommandAllowed returns true iff at least one pattern matches the command', () => {
      fc.assert(
        fc.property(commandIdArb, allowlistArb, (command, allowlist) => {
          const actual = isCommandAllowed(command, allowlist)
          const expected = allowlist.some((pattern) => referenceMatch(command, pattern))
          expect(actual).toBe(expected)
        }),
        { numRuns: 100 },
      )
    })

    it('exact match: command equals pattern means allowed', () => {
      fc.assert(
        fc.property(commandIdArb, (command) => {
          // A command should always match itself as an exact pattern
          expect(isCommandAllowed(command, [command])).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it('empty allowlist rejects all commands', () => {
      fc.assert(
        fc.property(commandIdArb, (command) => {
          expect(isCommandAllowed(command, [])).toBe(false)
        }),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 4: Glob wildcard does not cross segment boundaries
   *
   * For any glob pattern containing `*` and any command ID containing more
   * dot-separated segments than the pattern expects, the `*` SHALL NOT match
   * across dot boundaries. For example, pattern `a.b.*` should match `a.b.c`
   * but NOT `a.b.c.d`.
   *
   * **Validates: Requirements 3.4**
   */
  describe('Property 4: Glob wildcard does not cross segment boundaries', () => {
    it('* never matches across dot boundaries — extra segments cause mismatch', () => {
      fc.assert(
        fc.property(
          // Generate a pattern with at least one * segment
          fc.array(segmentArb, { minLength: 1, maxLength: 3 }).chain((prefix) =>
            fc.array(segmentArb, { minLength: 0, maxLength: 2 }).map((suffix) => ({
              prefix,
              suffix,
              pattern: [...prefix, '*', ...suffix].join('.'),
            })),
          ),
          // Generate extra segments to append (making the command longer than the pattern expects)
          fc.array(segmentArb, { minLength: 1, maxLength: 3 }),
          ({ prefix, suffix, pattern }, extraSegments) => {
            // Build a command that has more segments than the pattern
            // The pattern has prefix.length + 1 (*) + suffix.length segments
            // We create a command with those segments PLUS extra segments
            const matchingSegment = extraSegments[0] // Use first extra as the * match
            const commandSegments = [...prefix, matchingSegment, ...suffix, ...extraSegments]
            const command = commandSegments.join('.')

            // The command has more segments than the pattern, so it should NOT match
            const patternSegmentCount = prefix.length + 1 + suffix.length
            const commandSegmentCount = commandSegments.length

            if (commandSegmentCount > patternSegmentCount) {
              expect(matchCommandPattern(command, pattern)).toBe(false)
            }
          },
        ),
        { numRuns: 100 },
      )
    })

    it('pattern a.b.* matches a.b.c but not a.b.c.d', () => {
      // Concrete examples to verify the property
      expect(matchCommandPattern('a.b.c', 'a.b.*')).toBe(true)
      expect(matchCommandPattern('a.b.c.d', 'a.b.*')).toBe(false)
      expect(matchCommandPattern('workbench.action.openSettings', 'workbench.action.*')).toBe(true)
      expect(
        matchCommandPattern('workbench.action.editor.openSettings', 'workbench.action.*'),
      ).toBe(false)
    })

    it('* matches exactly one non-empty segment, never crossing dots', () => {
      fc.assert(
        fc.property(
          // Generate a pattern with exactly one * in it
          fc.array(segmentArb, { minLength: 1, maxLength: 2 }).chain((prefix) =>
            fc.array(segmentArb, { minLength: 1, maxLength: 2 }).map((suffix) => ({
              prefix,
              suffix,
              pattern: [...prefix, '*', ...suffix].join('.'),
            })),
          ),
          // Generate a single segment to replace the *
          segmentArb,
          ({ prefix, suffix, pattern }, replacement) => {
            // Command with the same number of segments as the pattern should match
            const command = [...prefix, replacement, ...suffix].join('.')
            expect(matchCommandPattern(command, pattern)).toBe(true)

            // Command with an extra dot in the replacement position should NOT match
            const multiSegmentReplacement = replacement + '.extra'
            const badCommand = [...prefix, multiSegmentReplacement, ...suffix].join('.')
            expect(matchCommandPattern(badCommand, pattern)).toBe(false)
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
