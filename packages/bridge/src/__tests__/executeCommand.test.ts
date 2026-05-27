import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Unit tests for the executeCommand and openInSimpleBrowser bridge actions.
 *
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6**
 */
describe('executeCommand bridge action — unit tests', () => {
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
   * executeCommand rejects with error for empty string input.
   *
   * **Validates: Requirements 1.5, 5.6**
   */
  it('rejects with error for empty string input', async () => {
    const { executeCommand } = await import('../actions/executeCommand.js')

    await expect(executeCommand('')).rejects.toThrow('Command ID must be a non-empty string')
    expect(postMessageMock).not.toHaveBeenCalled()
  })

  /**
   * executeCommand rejects with error for whitespace-only input.
   *
   * **Validates: Requirements 1.5, 5.6**
   */
  it('rejects with error for whitespace-only input', async () => {
    const { executeCommand } = await import('../actions/executeCommand.js')

    await expect(executeCommand('   ')).rejects.toThrow('Command ID must be a non-empty string')
    expect(postMessageMock).not.toHaveBeenCalled()
  })

  /**
   * executeCommand sends unextension.openSettings over the wire.
   *
   * **Validates: Requirements 1.2**
   */
  it('sends unextension.openSettings command over the wire', async () => {
    const { executeCommand } = await import('../actions/executeCommand.js')

    executeCommand('unextension.openSettings')

    expect(postMessageMock).toHaveBeenCalledTimes(1)
    const sentMessage = postMessageMock.mock.calls[0][0]
    expect(sentMessage.type).toBe('execute-command')
    expect(sentMessage.payload).toEqual({
      command: 'unextension.openSettings',
      args: [],
    })
  })

  /**
   * executeCommand sends unextension.openInBrowser with URL argument over the wire.
   *
   * **Validates: Requirements 1.3**
   */
  it('sends unextension.openInBrowser command with URL argument over the wire', async () => {
    const { executeCommand } = await import('../actions/executeCommand.js')

    executeCommand('unextension.openInBrowser', ['https://example.com'])

    expect(postMessageMock).toHaveBeenCalledTimes(1)
    const sentMessage = postMessageMock.mock.calls[0][0]
    expect(sentMessage.type).toBe('execute-command')
    expect(sentMessage.payload).toEqual({
      command: 'unextension.openInBrowser',
      args: ['https://example.com'],
    })
  })

  /**
   * executeCommand sends unextension.togglePanel over the wire.
   *
   * **Validates: Requirements 1.4**
   */
  it('sends unextension.togglePanel command over the wire', async () => {
    const { executeCommand } = await import('../actions/executeCommand.js')

    executeCommand('unextension.togglePanel')

    expect(postMessageMock).toHaveBeenCalledTimes(1)
    const sentMessage = postMessageMock.mock.calls[0][0]
    expect(sentMessage.type).toBe('execute-command')
    expect(sentMessage.payload).toEqual({
      command: 'unextension.togglePanel',
      args: [],
    })
  })

  /**
   * executeCommand sends unextension.toggleSidebar over the wire.
   *
   * **Validates: Requirements 1.5**
   */
  it('sends unextension.toggleSidebar command over the wire', async () => {
    const { executeCommand } = await import('../actions/executeCommand.js')

    executeCommand('unextension.toggleSidebar')

    expect(postMessageMock).toHaveBeenCalledTimes(1)
    const sentMessage = postMessageMock.mock.calls[0][0]
    expect(sentMessage.type).toBe('execute-command')
    expect(sentMessage.payload).toEqual({
      command: 'unextension.toggleSidebar',
      args: [],
    })
  })

  /**
   * executeCommand sends unextension.newScratchFile over the wire.
   *
   * **Validates: Requirements 1.6**
   */
  it('sends unextension.newScratchFile command over the wire', async () => {
    const { executeCommand } = await import('../actions/executeCommand.js')

    executeCommand('unextension.newScratchFile')

    expect(postMessageMock).toHaveBeenCalledTimes(1)
    const sentMessage = postMessageMock.mock.calls[0][0]
    expect(sentMessage.type).toBe('execute-command')
    expect(sentMessage.payload).toEqual({
      command: 'unextension.newScratchFile',
      args: [],
    })
  })
})

describe('openInSimpleBrowser bridge action — unit tests', () => {
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
   * openInSimpleBrowser returns { success: false } for empty URL.
   *
   * **Validates: Requirements 4.5**
   */
  it('returns { success: false } for empty URL', async () => {
    const { openInSimpleBrowser } = await import('../actions/openInSimpleBrowser.js')

    const result = await openInSimpleBrowser('')
    expect(result).toEqual({ success: false })
    expect(postMessageMock).not.toHaveBeenCalled()
  })

  /**
   * openInSimpleBrowser returns { success: true } when executeCommand resolves.
   *
   * **Validates: Requirements 4.5, 5.6**
   */
  it('returns { success: true } when executeCommand resolves', async () => {
    const { openInSimpleBrowser } = await import('../actions/openInSimpleBrowser.js')

    const promise = openInSimpleBrowser('https://example.com')

    // The bridge sends a message; simulate the IDE handler reply
    const sentMessage = postMessageMock.mock.calls[0][0]
    expect(sentMessage.type).toBe('execute-command')
    expect(sentMessage.payload).toEqual({
      command: 'unextension.openInBrowser',
      args: ['https://example.com'],
    })

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'execute-command:reply',
          payload: { result: null },
          correlationId: sentMessage.correlationId,
        },
      }),
    )

    const result = await promise
    expect(result).toEqual({ success: true })
  })

  /**
   * openInSimpleBrowser returns { success: false } when executeCommand throws.
   *
   * **Validates: Requirements 4.5, 5.6**
   */
  it('returns { success: false } when executeCommand throws', async () => {
    // Mock acquireVsCodeApi to throw when postMessage is called,
    // simulating a bridge failure
    vi.resetModules()
    const throwingPostMessage = vi.fn(() => {
      throw new Error('Bridge connection failed')
    })
    ;(window as any).acquireVsCodeApi = () => ({ postMessage: throwingPostMessage })

    const { openInSimpleBrowser } = await import('../actions/openInSimpleBrowser.js')

    const result = await openInSimpleBrowser('https://example.com')
    expect(result).toEqual({ success: false })
  })
})
