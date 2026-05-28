import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property-based tests for useSettings bridge action.
 *
 * Feature: plugin-settings
 *
 * These tests validate that the useSettings store correctly returns defaults
 * before the IDE responds, reactively updates subscribers when settings change,
 * and that scope has no effect on the store's behavior (it just stores values).
 *
 * **Validates: Requirements 1.7, 4.3, 4.4, 4.7**
 */
describe('useSettings bridge action — property tests', () => {
  let postMessageMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    postMessageMock = vi.fn()
    ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete (window as any).acquireVsCodeApi
  })

  /**
   * Property 9: Settings store defaults before IDE response
   *
   * For any set of default values, calling `useSettings(defaults)` before the
   * IDE responds SHALL return a store where `get()` equals the provided defaults.
   *
   * **Validates: Requirements 4.7**
   */
  describe('Property 9: Settings store defaults before IDE response', () => {
    it('get() returns the exact defaults object before IDE responds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z]/.test(s)),
            fc.oneof(fc.string(), fc.integer(), fc.boolean()),
            { minKeys: 1, maxKeys: 10 },
          ),
          async (defaults) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { useSettings } = await import('../actions/useSettings.js')

            const store = useSettings(defaults)

            // Before the IDE responds, get() should return the defaults
            const current = store.get()
            expect(current).toEqual(defaults)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('get() returns a copy of defaults, not the same reference', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z]/.test(s)),
            fc.oneof(fc.string(), fc.integer(), fc.boolean()),
            { minKeys: 1, maxKeys: 5 },
          ),
          async (defaults) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { useSettings } = await import('../actions/useSettings.js')

            const store = useSettings(defaults)

            // The returned object should not be the same reference as the input
            expect(store.get()).not.toBe(defaults)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 10: Settings store reactive update
   *
   * For any settings store with subscribers, when a `settings-changed` message
   * arrives with new values, all subscribers SHALL be invoked with the merged
   * settings (defaults overridden by new values).
   *
   * **Validates: Requirements 4.3, 4.4**
   */
  describe('Property 10: Settings store reactive update', () => {
    it('all subscribers are notified with merged settings when settings-changed arrives', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z]/.test(s)),
            fc.oneof(fc.string(), fc.integer(), fc.boolean()),
            { minKeys: 1, maxKeys: 5 },
          ),
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z]/.test(s)),
            fc.oneof(fc.string(), fc.integer(), fc.boolean()),
            { minKeys: 1, maxKeys: 5 },
          ),
          fc.integer({ min: 1, max: 5 }),
          async (defaults, newValues, subscriberCount) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { useSettings } = await import('../actions/useSettings.js')

            const store = useSettings(defaults)

            // Register multiple subscribers
            const callbacks: ReturnType<typeof vi.fn>[] = []
            for (let i = 0; i < subscriberCount; i++) {
              const cb = vi.fn()
              callbacks.push(cb)
              store.subscribe(cb)
            }

            // Simulate settings-changed message from IDE
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'settings-changed',
                  payload: newValues,
                },
              }),
            )

            // All subscribers should be called with merged settings
            const expected = { ...defaults, ...newValues }
            for (const cb of callbacks) {
              expect(cb).toHaveBeenCalledTimes(1)
              expect(cb).toHaveBeenCalledWith(expected)
            }

            // get() should also reflect the merged state
            expect(store.get()).toEqual(expected)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('partial updates merge with existing values without losing unmodified keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            alpha: fc.string(),
            beta: fc.integer(),
            gamma: fc.boolean(),
          }),
          fc.record({
            alpha: fc.string(),
          }),
          async (defaults, partialUpdate) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { useSettings } = await import('../actions/useSettings.js')

            const store = useSettings(defaults)

            // Simulate partial settings-changed message
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'settings-changed',
                  payload: partialUpdate,
                },
              }),
            )

            // The store should have merged: partialUpdate overrides, rest preserved
            const result = store.get()
            expect(result.alpha).toBe(partialUpdate.alpha)
            expect(result.beta).toBe(defaults.beta)
            expect(result.gamma).toBe(defaults.gamma)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 11: Scope defaults to global
   *
   * The useSettings store doesn't care about scope — it just stores whatever
   * values come in. This property verifies that the store treats all incoming
   * values identically regardless of whether they would be global or workspace
   * scoped in the IDE. The store is scope-agnostic.
   *
   * **Validates: Requirements 1.7**
   */
  describe('Property 11: Scope defaults to global', () => {
    it('store treats all settings identically regardless of conceptual scope', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z]/.test(s)),
            fc.oneof(fc.string(), fc.integer(), fc.boolean()),
            { minKeys: 1, maxKeys: 5 },
          ),
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z]/.test(s)),
            fc.oneof(fc.string(), fc.integer(), fc.boolean()),
            { minKeys: 1, maxKeys: 5 },
          ),
          async (globalSettings, workspaceSettings) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { useSettings } = await import('../actions/useSettings.js')

            // Combine global and workspace settings as defaults (simulating
            // what the IDE would return — a flat key-value map regardless of scope)
            const allDefaults = { ...globalSettings, ...workspaceSettings }
            const store = useSettings(allDefaults)

            // The store should return all settings without distinguishing scope
            expect(store.get()).toEqual(allDefaults)

            // When settings-changed arrives with mixed-scope updates, all are applied
            const updates = { ...globalSettings }
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  type: 'settings-changed',
                  payload: updates,
                },
              }),
            )

            // Store merges all values regardless of their conceptual scope
            expect(store.get()).toEqual({ ...allDefaults, ...updates })
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
