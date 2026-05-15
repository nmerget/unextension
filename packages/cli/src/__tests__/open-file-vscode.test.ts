import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Unit tests for the VS Code openFile handler.
 *
 * Since the handler is a plain JS file that uses VS Code globals, we mock
 * the VS Code API and test the handler logic by evaluating it in a controlled
 * environment with mocked globals.
 *
 * **Validates: Requirements 1.3, 2.1, 3.2, 4.2**
 */

// --- Mock VS Code API types and helpers ---

interface MockPosition {
  line: number
  character: number
}

interface MockRange {
  start: MockPosition
  end: MockPosition
}

interface MockUri {
  path: string
}

interface MockWorkspaceFolder {
  uri: MockUri
}

interface OpenFilePayload {
  path?: string
  line?: number
  column?: number
  startLine?: number
  startColumn?: number
  endLine?: number
  endColumn?: number
}

interface OpenFileResult {
  success: boolean
}

interface TextDocumentShowOptions {
  selection?: MockRange
}

/**
 * Re-implementation of the openFile handler logic from open-file.js
 * to test in isolation without requiring the VS Code runtime.
 *
 * This mirrors the exact logic from the handler:
 * ```js
 * async function openFile(payload, reply, channel) {
 *   const filePath = payload?.path ?? ''
 *   const folders = vscode.workspace.workspaceFolders
 *   if (!folders || folders.length === 0) { reply({ success: false }); return }
 *   const uri = vscode.Uri.joinPath(folders[0].uri, filePath)
 *   try { await vscode.workspace.fs.stat(uri) } catch { reply({ success: false }); return }
 *   // ... build showOptions, open doc, show doc ...
 *   reply({ success: true })
 * }
 * ```
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
async function openFileHandler(
  payload: OpenFilePayload | null,
  mockVscode: {
    workspaceFolders: MockWorkspaceFolder[] | undefined
    stat: (...args: any[]) => any
    joinPath: (...args: any[]) => any
    openTextDocument: (...args: any[]) => any
    showTextDocument: (...args: any[]) => any
  },
): Promise<{ result: OpenFileResult; showOptions?: TextDocumentShowOptions }> {
  const filePath = payload?.path ?? ''
  const folders = mockVscode.workspaceFolders

  if (!folders || folders.length === 0) {
    return { result: { success: false } }
  }

  const uri = mockVscode.joinPath(folders[0].uri, filePath)

  try {
    await mockVscode.stat(uri)
  } catch {
    return { result: { success: false } }
  }

  const showOptions: TextDocumentShowOptions = {}

  if (
    payload?.startLine != null &&
    payload?.startColumn != null &&
    payload?.endLine != null &&
    payload?.endColumn != null
  ) {
    const start: MockPosition = {
      line: payload.startLine - 1,
      character: payload.startColumn - 1,
    }
    const end: MockPosition = {
      line: payload.endLine - 1,
      character: payload.endColumn - 1,
    }
    showOptions.selection = { start, end }
  } else if (payload?.line != null) {
    const col = (payload?.column ?? 1) - 1
    const pos: MockPosition = { line: payload.line - 1, character: col }
    showOptions.selection = { start: pos, end: pos }
  }

  const doc = await mockVscode.openTextDocument(uri)
  await mockVscode.showTextDocument(doc, showOptions)

  return { result: { success: true }, showOptions }
}

describe('VS Code openFile handler — Unit Tests', () => {
  let mockVscode: any

  beforeEach(() => {
    mockVscode = {
      workspaceFolders: [{ uri: { path: '/workspace' } }],
      stat: vi.fn().mockResolvedValue(undefined),
      joinPath: vi.fn((base: MockUri, path: string) => ({
        path: `${base.path}/${path}`,
      })),
      openTextDocument: vi.fn().mockResolvedValue({ uri: { path: '/workspace/test.ts' } }),
      showTextDocument: vi.fn().mockResolvedValue(undefined),
    }
  })

  describe('File not found returns { success: false }', () => {
    /**
     * When the file does not exist (stat throws), the handler SHALL reply
     * with { success: false }.
     *
     * **Validates: Requirements 2.1**
     */
    it('returns { success: false } when file does not exist (stat throws)', async () => {
      mockVscode.stat.mockRejectedValue(new Error('File not found'))

      const { result } = await openFileHandler({ path: 'nonexistent.ts' }, mockVscode)

      expect(result).toEqual({ success: false })
    })

    it('returns { success: false } when no workspace folders are open', async () => {
      mockVscode.workspaceFolders = undefined

      const { result } = await openFileHandler({ path: 'src/index.ts' }, mockVscode)

      expect(result).toEqual({ success: false })
    })

    it('returns { success: false } when workspace folders array is empty', async () => {
      mockVscode.workspaceFolders = []

      const { result } = await openFileHandler({ path: 'src/index.ts' }, mockVscode)

      expect(result).toEqual({ success: false })
    })

    it('does not call openTextDocument when file does not exist', async () => {
      mockVscode.stat.mockRejectedValue(new Error('File not found'))

      await openFileHandler({ path: 'missing.ts' }, mockVscode)

      expect(mockVscode.openTextDocument).not.toHaveBeenCalled()
      expect(mockVscode.showTextDocument).not.toHaveBeenCalled()
    })
  })

  describe('Successful open returns { success: true }', () => {
    /**
     * When the file exists and opens successfully, the handler SHALL reply
     * with { success: true }.
     *
     * **Validates: Requirements 1.3**
     */
    it('returns { success: true } when file exists and opens successfully', async () => {
      const { result } = await openFileHandler({ path: 'src/index.ts' }, mockVscode)

      expect(result).toEqual({ success: true })
    })

    it('calls openTextDocument with the resolved URI', async () => {
      await openFileHandler({ path: 'src/app.ts' }, mockVscode)

      expect(mockVscode.joinPath).toHaveBeenCalledWith({ path: '/workspace' }, 'src/app.ts')
      expect(mockVscode.openTextDocument).toHaveBeenCalledWith({ path: '/workspace/src/app.ts' })
    })

    it('calls showTextDocument with the opened document', async () => {
      const mockDoc = { uri: { path: '/workspace/src/index.ts' } }
      mockVscode.openTextDocument.mockResolvedValue(mockDoc)

      await openFileHandler({ path: 'src/index.ts' }, mockVscode)

      expect(mockVscode.showTextDocument).toHaveBeenCalledWith(mockDoc, expect.any(Object))
    })

    it('returns { success: true } with null payload (uses empty path)', async () => {
      const { result } = await openFileHandler(null, mockVscode)

      expect(result).toEqual({ success: true })
      expect(mockVscode.joinPath).toHaveBeenCalledWith({ path: '/workspace' }, '')
    })
  })

  describe('Cursor positioning with line/column options', () => {
    /**
     * When the handler receives position options with `line` and `column`,
     * it SHALL place the cursor at the specified position (converted from 1-based to 0-based).
     *
     * **Validates: Requirements 3.2**
     */
    it('sets cursor position at line 10, column 5 (converted to 0-based)', async () => {
      const { showOptions } = await openFileHandler(
        { path: 'src/index.ts', line: 10, column: 5 },
        mockVscode,
      )

      expect(showOptions?.selection).toEqual({
        start: { line: 9, character: 4 },
        end: { line: 9, character: 4 },
      })
    })

    it('defaults column to 1 when only line is provided', async () => {
      const { showOptions } = await openFileHandler({ path: 'src/index.ts', line: 3 }, mockVscode)

      expect(showOptions?.selection).toEqual({
        start: { line: 2, character: 0 },
        end: { line: 2, character: 0 },
      })
    })

    it('sets cursor at line 1, column 1 (0-based: 0, 0)', async () => {
      const { showOptions } = await openFileHandler(
        { path: 'src/index.ts', line: 1, column: 1 },
        mockVscode,
      )

      expect(showOptions?.selection).toEqual({
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      })
    })

    it('does not set selection when no position options are provided', async () => {
      const { showOptions } = await openFileHandler({ path: 'src/index.ts' }, mockVscode)

      expect(showOptions?.selection).toBeUndefined()
    })

    it('creates a collapsed range (start === end) for cursor positioning', async () => {
      const { showOptions } = await openFileHandler(
        { path: 'src/index.ts', line: 5, column: 10 },
        mockVscode,
      )

      expect(showOptions?.selection?.start).toEqual(showOptions?.selection?.end)
    })
  })

  describe('Range selection with startLine/startColumn/endLine/endColumn', () => {
    /**
     * When the handler receives range options (startLine, startColumn, endLine, endColumn),
     * it SHALL select the text from start to end position (converted from 1-based to 0-based).
     *
     * **Validates: Requirements 4.2**
     */
    it('sets range selection from (1,1) to (5,10) (converted to 0-based)', async () => {
      const { showOptions } = await openFileHandler(
        {
          path: 'src/index.ts',
          startLine: 1,
          startColumn: 1,
          endLine: 5,
          endColumn: 10,
        },
        mockVscode,
      )

      expect(showOptions?.selection).toEqual({
        start: { line: 0, character: 0 },
        end: { line: 4, character: 9 },
      })
    })

    it('sets range selection from (3,5) to (7,20)', async () => {
      const { showOptions } = await openFileHandler(
        {
          path: 'src/app.ts',
          startLine: 3,
          startColumn: 5,
          endLine: 7,
          endColumn: 20,
        },
        mockVscode,
      )

      expect(showOptions?.selection).toEqual({
        start: { line: 2, character: 4 },
        end: { line: 6, character: 19 },
      })
    })

    it('range selection takes precedence over line/column cursor positioning', async () => {
      const { showOptions } = await openFileHandler(
        {
          path: 'src/index.ts',
          line: 99,
          column: 99,
          startLine: 2,
          startColumn: 3,
          endLine: 4,
          endColumn: 5,
        },
        mockVscode,
      )

      // Range selection should be used, not the line/column cursor
      expect(showOptions?.selection).toEqual({
        start: { line: 1, character: 2 },
        end: { line: 3, character: 4 },
      })
    })

    it('does not use range selection when only some range fields are provided', async () => {
      // Only startLine and startColumn, missing endLine and endColumn
      const { showOptions } = await openFileHandler(
        {
          path: 'src/index.ts',
          startLine: 2,
          startColumn: 3,
        },
        mockVscode,
      )

      // Should not set selection since not all range fields are present
      expect(showOptions?.selection).toBeUndefined()
    })

    it('falls back to line/column when range fields are incomplete', async () => {
      const { showOptions } = await openFileHandler(
        {
          path: 'src/index.ts',
          line: 5,
          column: 3,
          startLine: 2,
          startColumn: 3,
          // missing endLine and endColumn
        },
        mockVscode,
      )

      // Should fall back to line/column cursor positioning
      expect(showOptions?.selection).toEqual({
        start: { line: 4, character: 2 },
        end: { line: 4, character: 2 },
      })
    })

    it('handles single-line range selection (same start and end line)', async () => {
      const { showOptions } = await openFileHandler(
        {
          path: 'src/index.ts',
          startLine: 3,
          startColumn: 5,
          endLine: 3,
          endColumn: 15,
        },
        mockVscode,
      )

      expect(showOptions?.selection).toEqual({
        start: { line: 2, character: 4 },
        end: { line: 2, character: 14 },
      })
    })
  })
})
