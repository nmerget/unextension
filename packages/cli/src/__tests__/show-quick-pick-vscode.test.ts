import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Unit tests for the VS Code showQuickPick target action.
 *
 * The action file (`show-quick-pick.js`) defines a top-level `showQuickPick`
 * function that uses the global `vscode.window.showQuickPick` API.
 * We mock the `vscode` global and exercise the function directly.
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 2.5**
 */

// We need to load the action file which expects `vscode` as a global.
// We'll eval the file content with a mocked vscode global.

const mockShowQuickPick = vi.fn()
const mockVscode = {
  window: {
    showQuickPick: mockShowQuickPick,
  },
}

// Load the action function by reading the file and evaluating it
// with the vscode global in scope.
async function loadShowQuickPick(): Promise<
  (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reply: (result: any) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel: any,
  ) => Promise<void>
> {
  const fs = await import('fs')
  const path = await import('path')
  const filePath = path.resolve(import.meta.dirname, '../targets/vscode/actions/show-quick-pick.js')
  const code = fs.readFileSync(filePath, 'utf-8')

  // Strip the reference directive and create a function that returns showQuickPick
  const wrappedCode = `
    const vscode = this.vscode;
    ${code}
    return showQuickPick;
  `
  const factory = new Function(wrappedCode)
  return factory.call({ vscode: mockVscode })
}

describe('VS Code showQuickPick action', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let showQuickPick: (payload: any, reply: (result: any) => void, channel: any) => Promise<void>

  beforeEach(async () => {
    mockShowQuickPick.mockReset()
    showQuickPick = await loadShowQuickPick()
  })

  /**
   * Validates: Requirement 4.1
   * WHEN the user selects a single item in single-select mode,
   * THE Host_IDE SHALL return a QuickPickResult with `selected` set to the chosen QuickPickItem
   */
  it('single-select returns the correct QuickPickItem', async () => {
    const payload = {
      items: [
        { label: 'TypeScript', description: 'Typed JS', detail: 'A typed superset', value: 'ts' },
        { label: 'JavaScript', description: 'Dynamic', detail: 'Scripting language', value: 'js' },
      ],
    }

    // Mock vscode.window.showQuickPick to return the first item (as mapped internally)
    mockShowQuickPick.mockResolvedValue({
      label: 'TypeScript',
      description: 'Typed JS',
      detail: 'A typed superset',
      _value: 'ts',
    })

    const reply = vi.fn()
    await showQuickPick(payload, reply, {})

    expect(reply).toHaveBeenCalledOnce()
    expect(reply).toHaveBeenCalledWith({
      selected: {
        label: 'TypeScript',
        description: 'Typed JS',
        detail: 'A typed superset',
        value: 'ts',
      },
    })
  })

  /**
   * Validates: Requirement 4.2
   * WHEN the user selects items in multi-select mode,
   * THE Host_IDE SHALL return a QuickPickResult with `selected` set to an array of chosen QuickPickItem objects
   */
  it('multi-select returns an array of QuickPickItems', async () => {
    const payload = {
      items: [
        { label: 'TypeScript', description: 'Typed JS', value: 'ts' },
        { label: 'JavaScript', description: 'Dynamic', value: 'js' },
        { label: 'Rust', description: 'Systems', value: 'rs' },
      ],
      options: { canPickMany: true },
    }

    // Mock returns an array when canPickMany is true
    mockShowQuickPick.mockResolvedValue([
      { label: 'TypeScript', description: 'Typed JS', detail: '', _value: 'ts' },
      { label: 'Rust', description: 'Systems', detail: '', _value: 'rs' },
    ])

    const reply = vi.fn()
    await showQuickPick(payload, reply, {})

    expect(reply).toHaveBeenCalledOnce()
    expect(reply).toHaveBeenCalledWith({
      selected: [
        { label: 'TypeScript', description: 'Typed JS', detail: undefined, value: 'ts' },
        { label: 'Rust', description: 'Systems', detail: undefined, value: 'rs' },
      ],
    })

    // Verify canPickMany was passed to vscode
    expect(mockShowQuickPick).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ canPickMany: true }),
    )
  })

  /**
   * Validates: Requirement 4.3
   * WHEN the user cancels the quick-pick dialog,
   * THE Host_IDE SHALL return a QuickPickResult with `selected` set to null
   */
  it('cancellation returns { selected: null }', async () => {
    const payload = {
      items: [
        { label: 'TypeScript', value: 'ts' },
        { label: 'JavaScript', value: 'js' },
      ],
    }

    // vscode.window.showQuickPick returns undefined when user cancels
    mockShowQuickPick.mockResolvedValue(undefined)

    const reply = vi.fn()
    await showQuickPick(payload, reply, {})

    expect(reply).toHaveBeenCalledOnce()
    expect(reply).toHaveBeenCalledWith({ selected: null })
  })

  /**
   * Validates: Requirement 2.5
   * WHEN a QuickPickItem has no `value` field,
   * THE Host_IDE SHALL treat the `label` as the value in the returned result
   */
  it('missing value defaults to label', async () => {
    const payload = {
      items: [{ label: 'TypeScript' }, { label: 'JavaScript' }],
    }

    // The action maps items without value to use label as _value
    // Mock returns the item as vscode would (with _value set to label)
    mockShowQuickPick.mockResolvedValue({
      label: 'TypeScript',
      description: '',
      detail: '',
      _value: 'TypeScript', // Falls back to label since no value was provided
    })

    const reply = vi.fn()
    await showQuickPick(payload, reply, {})

    expect(reply).toHaveBeenCalledOnce()
    expect(reply).toHaveBeenCalledWith({
      selected: {
        label: 'TypeScript',
        description: undefined,
        detail: undefined,
        value: 'TypeScript', // value should equal label when not explicitly provided
      },
    })
  })
})
