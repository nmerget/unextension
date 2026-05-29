import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Unit tests for the useSettings bridge action.
 *
 * **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8**
 */
describe('useSettings bridge action — unit tests', () => {
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
   * get() returns defaults immediately after creation (before IDE responds).
   *
   * **Validates: Requirements 4.7**
   */
  it('get() returns defaults before IDE responds', async () => {
    const { useSettings } = await import('../actions/useSettings.js')

    const defaults = { fontSize: 14, theme: 'dark', autoSave: true }
    const store = useSettings(defaults)

    // Before any IDE response, get() should return the defaults
    expect(store.get()).toEqual({ fontSize: 14, theme: 'dark', autoSave: true })
  })

  /**
   * subscribe callback is invoked when a settings-changed message arrives.
   *
   * **Validates: Requirements 4.3, 4.4**
   */
  it('subscribe is called when settings-changed message arrives', async () => {
    const { useSettings } = await import('../actions/useSettings.js')

    const defaults = { fontSize: 14, theme: 'dark' }
    const store = useSettings(defaults)

    const callback = vi.fn()
    store.subscribe(callback)

    // Simulate a settings-changed push message from the IDE
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'settings-changed', payload: { fontSize: 18 } },
      }),
    )

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith({ fontSize: 18, theme: 'dark' })
  })

  /**
   * Unsubscribe function (returned by subscribe) removes the listener —
   * subsequent messages don't trigger the callback.
   *
   * **Validates: Requirements 4.5**
   */
  it('unsubscribe function removes listener', async () => {
    const { useSettings } = await import('../actions/useSettings.js')

    const defaults = { fontSize: 14, theme: 'dark' }
    const store = useSettings(defaults)

    const callback = vi.fn()
    const unsubscribe = store.subscribe(callback)

    // First message should trigger callback
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'settings-changed', payload: { fontSize: 18 } },
      }),
    )
    expect(callback).toHaveBeenCalledTimes(1)

    // Unsubscribe
    unsubscribe()

    // Second message should NOT trigger callback
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'settings-changed', payload: { theme: 'light' } },
      }),
    )
    expect(callback).toHaveBeenCalledTimes(1) // Still 1, not 2
  })

  /**
   * Partial updates merge with existing values (only changed keys are updated,
   * others remain).
   *
   * **Validates: Requirements 4.3, 4.4**
   */
  it('partial updates merge with existing values', async () => {
    const { useSettings } = await import('../actions/useSettings.js')

    const defaults = { fontSize: 14, theme: 'dark', autoSave: true }
    const store = useSettings(defaults)

    // Send a partial update — only fontSize changes
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'settings-changed', payload: { fontSize: 20 } },
      }),
    )

    // get() should reflect the merge: fontSize updated, others unchanged
    expect(store.get()).toEqual({ fontSize: 20, theme: 'dark', autoSave: true })

    // Send another partial update — only theme changes
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'settings-changed', payload: { theme: 'light' } },
      }),
    )

    // Both previous updates should be preserved
    expect(store.get()).toEqual({ fontSize: 20, theme: 'light', autoSave: true })
  })

  /**
   * When bridge is unavailable (request rejects), defaults are returned and
   * a warning is logged.
   *
   * **Validates: Requirements 4.8**
   */
  it('bridge unavailable returns defaults and logs warning', async () => {
    // Remove the VS Code API so bridge has no transport
    delete (window as any).acquireVsCodeApi

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useSettings } = await import('../actions/useSettings.js')

    const defaults = { fontSize: 14, theme: 'dark' }
    const store = useSettings(defaults)

    // get() should still return defaults
    expect(store.get()).toEqual({ fontSize: 14, theme: 'dark' })

    // Wait for the async path to complete (microtask)
    await new Promise((resolve) => setTimeout(resolve, 10))

    // A warning should have been logged (bridge logs "No bridge available" when no transport exists)
    expect(warnSpy).toHaveBeenCalledWith('[unextension] No bridge available')

    warnSpy.mockRestore()
  })
})
