// @ts-check
/// <reference path="./globals.js" />

/**
 * @param {{ path?: string, openFilesOnly?: boolean } | null} payload
 * @param {(result: { diagnostics: Array<{ file: string, line: number, column: number, endLine?: number, endColumn?: number, message: string, severity: 'error' | 'warning' | 'info' | 'hint', source?: string }> }) => void} reply
 * @param {import('vscode').OutputChannel} channel
 * @returns {Promise<void>}
 */
async function getDiagnostics(payload, reply, channel) {
  const filterPath = payload?.path ?? null
  const openFilesOnly = payload?.openFilesOnly ?? false

  const folders = vscode.workspace.workspaceFolders
  if (!folders || folders.length === 0) {
    reply({ diagnostics: [] })
    return
  }

  const allDiagnostics = vscode.languages.getDiagnostics()
  const results = []

  for (const [uri, diagnostics] of allDiagnostics) {
    const relativePath = vscode.workspace.asRelativePath(uri, false)

    // Apply path filter
    if (filterPath && relativePath !== filterPath) continue

    // Apply openFilesOnly filter
    if (openFilesOnly) {
      const openDoc = vscode.workspace.textDocuments.find(
        (doc) => doc.uri.toString() === uri.toString(),
      )
      if (!openDoc) continue
    }

    for (const diag of diagnostics) {
      /** @type {any} */
      const entry = {
        file: relativePath,
        line: diag.range.start.line + 1,
        column: diag.range.start.character + 1,
        message: diag.message,
        severity: mapSeverity(diag.severity),
      }

      // Include end position if range spans more than a point
      if (
        diag.range.end.line !== diag.range.start.line ||
        diag.range.end.character !== diag.range.start.character
      ) {
        entry.endLine = diag.range.end.line + 1
        entry.endColumn = diag.range.end.character + 1
      }

      // Include source if available
      if (diag.source) {
        entry.source = diag.source
      }

      results.push(entry)
    }
  }

  ;(channel || output).appendLine(
    '[unextension] getDiagnostics: ' + results.length + ' diagnostic(s)',
  )
  reply({ diagnostics: results })
}

/**
 * @param {import('vscode').DiagnosticSeverity} severity
 * @returns {'error' | 'warning' | 'info' | 'hint'}
 */
function mapSeverity(severity) {
  switch (severity) {
    case vscode.DiagnosticSeverity.Error:
      return 'error'
    case vscode.DiagnosticSeverity.Warning:
      return 'warning'
    case vscode.DiagnosticSeverity.Information:
      return 'info'
    case vscode.DiagnosticSeverity.Hint:
      return 'hint'
    default:
      return 'info'
  }
}
