// @ts-check
/// <reference path="./globals.js" />

/**
 * Computes the Longest Common Subsequence (LCS) table for two arrays of lines.
 * @param {string[]} a - Original lines
 * @param {string[]} b - Modified lines
 * @returns {number[][]} LCS length table
 */
function computeLcsTable(a, b) {
  const m = a.length
  const n = b.length
  /** @type {number[][]} */
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  return dp
}

/**
 * @typedef {{ origStart: number, origCount: number, modStart: number, modCount: number }} Hunk
 */

/**
 * Computes hunks (contiguous change regions) between original and modified content.
 * Uses LCS-based diff to identify changed regions, then groups adjacent changes into hunks.
 * @param {string} original - Original content
 * @param {string} modified - Modified content
 * @returns {Hunk[]} Array of hunks representing contiguous change regions
 */
function computeHunks(original, modified) {
  const origLines = original.split('\n')
  const modLines = modified.split('\n')
  const dp = computeLcsTable(origLines, modLines)

  // Backtrack to find edit operations
  /** @type {Array<{ type: 'equal' | 'delete' | 'insert', origIdx?: number, modIdx?: number }>} */
  const ops = []
  let i = origLines.length
  let j = modLines.length
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === modLines[j - 1]) {
      ops.push({ type: 'equal', origIdx: i - 1, modIdx: j - 1 })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'insert', modIdx: j - 1 })
      j--
    } else {
      ops.push({ type: 'delete', origIdx: i - 1 })
      i--
    }
  }
  ops.reverse()

  // Group consecutive non-equal operations into hunks
  /** @type {Hunk[]} */
  const hunks = []
  let k = 0
  while (k < ops.length) {
    if (ops[k].type === 'equal') {
      k++
      continue
    }
    // Start of a hunk
    let origStart = -1
    let origEnd = -1
    let modStart = -1
    let modEnd = -1

    while (k < ops.length && ops[k].type !== 'equal') {
      const op = ops[k]
      if (op.type === 'delete' && op.origIdx !== undefined) {
        if (origStart === -1) origStart = op.origIdx
        origEnd = op.origIdx
      }
      if (op.type === 'insert' && op.modIdx !== undefined) {
        if (modStart === -1) modStart = op.modIdx
        modEnd = op.modIdx
      }
      k++
    }

    // Determine hunk boundaries
    const hOrigStart = origStart === -1 ? (origEnd === -1 ? 0 : origEnd) : origStart
    const hOrigCount = origStart === -1 ? 0 : origEnd - origStart + 1
    const hModStart = modStart === -1 ? (modEnd === -1 ? 0 : modEnd) : modStart
    const hModCount = modStart === -1 ? 0 : modEnd - modStart + 1

    hunks.push({
      origStart: hOrigStart,
      origCount: hOrigCount,
      modStart: hModStart,
      modCount: hModCount,
    })
  }

  return hunks
}

/**
 * @param {{ filePath?: string, originalContent?: string, modifiedContent: string, title?: string, autoApply?: boolean } | null} payload
 * @param {(result: { accepted: boolean, hunks: Array<{index: number, accepted: boolean}> | null, content?: string }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {Promise<void>}
 */
async function openDiff(payload, reply, channel) {
  if (!payload) {
    reply({ accepted: false, hunks: null })
    return
  }

  const filePath = payload.filePath
  const autoApply = payload.autoApply !== false // default true
  let originalContent = payload.originalContent ?? ''

  // Read from file if originalContent not provided
  if (!payload.originalContent && filePath) {
    const folders = vscode.workspace.workspaceFolders
    if (folders && folders.length > 0) {
      const uri = vscode.Uri.joinPath(folders[0].uri, filePath)
      try {
        const bytes = await vscode.workspace.fs.readFile(uri)
        originalContent = Buffer.from(bytes).toString('utf8')
      } catch {
        ;(channel || output).appendLine('[unextension] openDiff: failed to read file ' + filePath)
        reply({ accepted: false, hunks: null })
        return
      }
    } else {
      reply({ accepted: false, hunks: null })
      return
    }
  }

  const modifiedContent = payload.modifiedContent
  const title = payload.title || (filePath ? filePath.split('/').pop() : 'Diff')

  // Compute hunks to determine if per-hunk mode should be activated
  const hunks = computeHunks(originalContent, modifiedContent)
  const usePerHunkMode = hunks.length > 1

  // Create virtual document scheme for diff
  const scheme = 'unextension-diff-' + Math.random().toString(36).slice(2)
  const originalUri = vscode.Uri.parse(scheme + ':original')
  const modifiedUri = vscode.Uri.parse(scheme + ':modified')

  /** @type {import('vscode').TextDocumentContentProvider} */
  const provider = {
    provideTextDocumentContent(uri) {
      return uri.path === 'original' ? originalContent : modifiedContent
    },
  }

  const registration = vscode.workspace.registerTextDocumentContentProvider(scheme, provider)

  /** @type {import('vscode').Disposable[]} */
  const disposables = [registration]

  let resolved = false

  function cleanup() {
    if (resolved) return
    resolved = true
    for (const d of disposables) {
      d.dispose()
    }
    vscode.commands.executeCommand('workbench.action.closeActiveEditor')
  }

  // Register accept command (whole-file)
  const acceptDisposable = vscode.commands.registerCommand(
    'unextension.openDiff.accept',
    async () => {
      if (resolved) return
      if (autoApply && filePath) {
        const folders = vscode.workspace.workspaceFolders
        if (folders && folders.length > 0) {
          const uri = vscode.Uri.joinPath(folders[0].uri, filePath)
          await vscode.workspace.fs.writeFile(uri, Buffer.from(modifiedContent, 'utf8'))
        }
      }
      /** @type {{ accepted: boolean, hunks: null, content?: string }} */
      const result = { accepted: true, hunks: null }
      if (autoApply && !filePath) {
        result.content = modifiedContent
      }
      ;(channel || output).appendLine('[unextension] openDiff: accepted — ' + (title || ''))
      reply(result)
      cleanup()
    },
  )
  disposables.push(acceptDisposable)

  // Register reject command (whole-file)
  const rejectDisposable = vscode.commands.registerCommand('unextension.openDiff.reject', () => {
    if (resolved) return
    ;(channel || output).appendLine('[unextension] openDiff: rejected — ' + (title || ''))
    reply({ accepted: false, hunks: null })
    cleanup()
  })
  disposables.push(rejectDisposable)

  // --- Per-hunk support ---
  if (usePerHunkMode) {
    /** @type {Map<number, boolean>} */
    const hunkDecisions = new Map()

    // Register per-hunk accept command
    const hunkAcceptDisposable = vscode.commands.registerCommand(
      'unextension.openDiff.acceptHunk',
      /** @param {number} hunkIndex */
      (hunkIndex) => {
        if (resolved) return
        hunkDecisions.set(hunkIndex, true)
        codeLensChangeEmitter.fire()
        ;(channel || output).appendLine(
          '[unextension] openDiff: accepted hunk ' + hunkIndex + ' — ' + (title || ''),
        )
      },
    )
    disposables.push(hunkAcceptDisposable)

    // Register per-hunk reject command
    const hunkRejectDisposable = vscode.commands.registerCommand(
      'unextension.openDiff.rejectHunk',
      /** @param {number} hunkIndex */
      (hunkIndex) => {
        if (resolved) return
        hunkDecisions.set(hunkIndex, false)
        codeLensChangeEmitter.fire()
        ;(channel || output).appendLine(
          '[unextension] openDiff: rejected hunk ' + hunkIndex + ' — ' + (title || ''),
        )
      },
    )
    disposables.push(hunkRejectDisposable)

    // Register finalize command — assembles HunkDecision[] and calls reply
    const finalizeDisposable = vscode.commands.registerCommand(
      'unextension.openDiff.finalize',
      async () => {
        if (resolved) return

        // Build the hunks array with a decision for every hunk
        /** @type {Array<{index: number, accepted: boolean}>} */
        const hunkResults = []
        for (let idx = 0; idx < hunks.length; idx++) {
          // Default to accepted if no explicit decision was made
          const accepted = hunkDecisions.has(idx)
            ? /** @type {boolean} */ (hunkDecisions.get(idx))
            : true
          hunkResults.push({ index: idx, accepted })
        }

        // Determine if any hunk was accepted
        const anyAccepted = hunkResults.some((h) => h.accepted)

        if (anyAccepted && autoApply && filePath) {
          // Build the merged content based on hunk decisions
          const mergedContent = applyHunkDecisions(
            originalContent,
            modifiedContent,
            hunks,
            hunkResults,
          )
          const folders = vscode.workspace.workspaceFolders
          if (folders && folders.length > 0) {
            const uri = vscode.Uri.joinPath(folders[0].uri, filePath)
            await vscode.workspace.fs.writeFile(uri, Buffer.from(mergedContent, 'utf8'))
          }
        }

        /** @type {{ accepted: boolean, hunks: Array<{index: number, accepted: boolean}>, content?: string }} */
        const result = { accepted: anyAccepted, hunks: hunkResults }
        if (anyAccepted && autoApply && !filePath) {
          result.content = applyHunkDecisions(originalContent, modifiedContent, hunks, hunkResults)
        }

        ;(channel || output).appendLine(
          '[unextension] openDiff: finalized with ' +
            hunkResults.filter((h) => h.accepted).length +
            '/' +
            hunkResults.length +
            ' hunks accepted — ' +
            (title || ''),
        )
        reply(result)
        cleanup()
      },
    )
    disposables.push(finalizeDisposable)

    // CodeLens provider for per-hunk Accept/Reject buttons
    const codeLensChangeEmitter = new vscode.EventEmitter()

    /** @type {import('vscode').CodeLensProvider} */
    const codeLensProvider = {
      onDidChangeCodeLenses: codeLensChangeEmitter.event,
      provideCodeLenses(document) {
        // Only provide lenses for the modified-side document
        if (document.uri.toString() !== modifiedUri.toString()) {
          return []
        }

        /** @type {import('vscode').CodeLens[]} */
        const lenses = []

        for (let idx = 0; idx < hunks.length; idx++) {
          const hunk = hunks[idx]
          const line = Math.max(0, hunk.modStart)
          const range = new vscode.Range(line, 0, line, 0)

          const decision = hunkDecisions.get(idx)
          const statusPrefix = decision === true ? '✓ ' : decision === false ? '✗ ' : ''

          lenses.push(
            new vscode.CodeLens(range, {
              title: statusPrefix + 'Accept Hunk #' + (idx + 1),
              command: 'unextension.openDiff.acceptHunk',
              arguments: [idx],
            }),
          )
          lenses.push(
            new vscode.CodeLens(range, {
              title: statusPrefix + 'Reject Hunk #' + (idx + 1),
              command: 'unextension.openDiff.rejectHunk',
              arguments: [idx],
            }),
          )
        }

        return lenses
      },
    }

    const codeLensRegistration = vscode.languages.registerCodeLensProvider(
      { scheme },
      codeLensProvider,
    )
    disposables.push(codeLensRegistration)
    disposables.push(codeLensChangeEmitter)
  }

  // Open diff editor
  await vscode.commands.executeCommand('vscode.diff', originalUri, modifiedUri, title + ' (Review)')
  ;(channel || output).appendLine('[unextension] openDiff: opened diff — ' + (title || ''))
}

/**
 * Applies hunk decisions to produce merged content.
 * For accepted hunks, uses the modified content; for rejected hunks, keeps the original content.
 * @param {string} original - Original content
 * @param {string} modified - Modified content
 * @param {Hunk[]} hunks - Array of computed hunks
 * @param {Array<{index: number, accepted: boolean}>} decisions - Hunk decisions
 * @returns {string} Merged content
 */
function applyHunkDecisions(original, modified, hunks, decisions) {
  const origLines = original.split('\n')
  const modLines = modified.split('\n')

  // Build a map of decision by index for quick lookup
  /** @type {Map<number, boolean>} */
  const decisionMap = new Map()
  for (const d of decisions) {
    decisionMap.set(d.index, d.accepted)
  }

  // We reconstruct the output by walking through the original lines
  // and applying or skipping hunks based on decisions
  /** @type {string[]} */
  const resultLines = []
  let origPos = 0

  for (let idx = 0; idx < hunks.length; idx++) {
    const hunk = hunks[idx]
    const accepted = decisionMap.get(idx) !== false

    // Copy unchanged lines before this hunk
    while (origPos < hunk.origStart) {
      resultLines.push(origLines[origPos])
      origPos++
    }

    if (accepted) {
      // Use modified lines for this hunk
      for (let m = hunk.modStart; m < hunk.modStart + hunk.modCount; m++) {
        resultLines.push(modLines[m])
      }
    } else {
      // Keep original lines for this hunk
      for (let o = hunk.origStart; o < hunk.origStart + hunk.origCount; o++) {
        resultLines.push(origLines[o])
      }
    }

    origPos = hunk.origStart + hunk.origCount
  }

  // Copy remaining lines after the last hunk
  while (origPos < origLines.length) {
    resultLines.push(origLines[origPos])
    origPos++
  }

  return resultLines.join('\n')
}
