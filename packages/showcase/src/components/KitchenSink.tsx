import { useState } from 'react'
import {
  bridge,
  listProjectFiles,
  runCommand,
  notify,
  readProjectFile,
  writeProjectFile,
  runScript,
  getClipboard,
  setClipboard,
  getActiveEditor,
  getDiagnostics,
  getTheme,
  openFile,
  showQuickPick,
} from '@unextension/bridge'

interface LogEntry {
  time: string
  text: string
}

export function KitchenSink() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const add = (text: string) =>
    setEntries((prev) => [{ time: new Date().toLocaleTimeString(), text }, ...prev])

  const handlePostMessage = () => {
    bridge.postMessage('ping', { from: 'kitchen-sink' })
    add('📤 postMessage → ping')
  }

  const handleListProjectFiles = async () => {
    add('⏳ listProjectFiles…')
    try {
      const files = await listProjectFiles({ pattern: '**/*.ts' })
      add(
        `📁 listProjectFiles → ${files.length} file(s): ${files.slice(0, 3).join(', ')}${files.length > 3 ? '…' : ''}`,
      )
    } catch (e) {
      add(`❌ listProjectFiles error: ${e}`)
    }
  }

  const handleRunCommand = async () => {
    add('⏳ runCommand…')
    try {
      const result = await runCommand('echo hello from unextension')
      add(`✅ runCommand → exit ${result.exitCode}: ${result.stdout.trim()}`)
    } catch (e) {
      add(`❌ runCommand error: ${e}`)
    }
  }

  const handleNotify = async () => {
    await notify('Hello from unextension KitchenSink!', 'info')
    add('🔔 notify → info sent')
  }

  const handleReadProjectFile = async () => {
    add('⏳ readProjectFile → package.json…')
    try {
      const result = await readProjectFile('package.json')
      add(`📄 readProjectFile → ${result.content.length} chars`)
    } catch (e) {
      add(`❌ readProjectFile error: ${e}`)
    }
  }

  const handleWriteProjectFile = async () => {
    add('⏳ writeProjectFile → unextension-test.txt…')
    try {
      const result = await writeProjectFile(
        'unextension-test.txt',
        `written by unextension at ${new Date().toISOString()}`,
      )
      add(`✏️ writeProjectFile → success: ${result.success}`)
    } catch (e) {
      add(`❌ writeProjectFile error: ${e}`)
    }
  }

  const handleRunScript = async () => {
    add('⏳ runScript → hello…')
    try {
      const result = await runScript('hello', { from: 'kitchen-sink' })
      add(`🚀 runScript → exit ${result.exitCode}: ${JSON.stringify(result.result)}`)
    } catch (e) {
      add(`❌ runScript error: ${e}`)
    }
  }

  const handleGetClipboard = async () => {
    add('⏳ getClipboard…')
    try {
      const result = await getClipboard()
      add(`📋 getClipboard → "${result.text.slice(0, 80)}${result.text.length > 80 ? '…' : ''}"`)
    } catch (e) {
      add(`❌ getClipboard error: ${e}`)
    }
  }

  const handleSetClipboard = async () => {
    const sample = `Copied by unextension at ${new Date().toISOString()}`
    add(`⏳ setClipboard → "${sample}"…`)
    try {
      const result = await setClipboard(sample)
      add(`📋 setClipboard → success: ${result.success}`)
    } catch (e) {
      add(`❌ setClipboard error: ${e}`)
    }
  }

  const handleGetActiveEditor = async () => {
    add('⏳ getActiveEditor…')
    try {
      const result = await getActiveEditor()
      if (result) {
        add(
          `📝 getActiveEditor → ${result.relativePath} (${result.language}) L${result.startLine}:${result.startColumn}`,
        )
      } else {
        add('📝 getActiveEditor → null (no editor open)')
      }
    } catch (e) {
      add(`❌ getActiveEditor error: ${e}`)
    }
  }

  const handleGetActiveEditorWithContent = async () => {
    add('⏳ getActiveEditor (includeContent)…')
    try {
      const result = await getActiveEditor({ includeContent: true })
      if (result) {
        add(`📝 getActiveEditor → ${result.relativePath} (${result.content?.length ?? 0} chars)`)
      } else {
        add('📝 getActiveEditor → null (no editor open)')
      }
    } catch (e) {
      add(`❌ getActiveEditor error: ${e}`)
    }
  }

  const handleGetDiagnostics = async () => {
    add('⏳ getDiagnostics…')
    try {
      const result = await getDiagnostics()
      add(`🔍 getDiagnostics → ${result.diagnostics.length} diagnostic(s)`)
    } catch (e) {
      add(`❌ getDiagnostics error: ${e}`)
    }
  }

  const handleGetDiagnosticsOpenFiles = async () => {
    add('⏳ getDiagnostics (open files)…')
    try {
      const result = await getDiagnostics({ openFilesOnly: true })
      add(`🔍 getDiagnostics (open) → ${result.diagnostics.length} diagnostic(s)`)
    } catch (e) {
      add(`❌ getDiagnostics error: ${e}`)
    }
  }

  const handleGetTheme = async () => {
    add('⏳ getTheme…')
    try {
      const result = await getTheme()
      const colorCount = Object.keys(result.colors).length
      add(`🎨 getTheme → ${result.colorScheme}, ${colorCount} color(s)`)
    } catch (e) {
      add(`❌ getTheme error: ${e}`)
    }
  }

  const handleOpenFile = async () => {
    add('⏳ openFile…')
    try {
      const result = await openFile('src/index.ts', { line: 1, column: 1 })
      add(`📂 openFile → success: ${result.success}`)
    } catch (e) {
      add(`❌ openFile error: ${e}`)
    }
  }

  const handleShowQuickPick = async () => {
    add('⏳ showQuickPick…')
    try {
      const result = await showQuickPick(
        [
          { label: 'TypeScript', description: 'Typed JavaScript', value: 'ts' },
          { label: 'JavaScript', description: 'Dynamic language', value: 'js' },
          { label: 'Rust', description: 'Systems language', value: 'rs' },
        ],
        { title: 'Pick a language', placeholder: 'Search languages...' },
      )
      console.log('showQuickPick result:', result)
      add(
        `🎯 showQuickPick → ${result.selected ? JSON.stringify(result.selected) : 'null (cancelled)'}`,
      )
    } catch (e) {
      add(`❌ showQuickPick error: ${e}`)
    }
  }

  return (
    <div className="kitchen-sink">
      <h2>🧪 Kitchen Sink</h2>
      <div className="kitchen-sink__actions">
        <button type="button" onClick={handlePostMessage}>
          postMessage
        </button>
        <button type="button" onClick={handleListProjectFiles}>
          listProjectFiles
        </button>
        <button type="button" onClick={handleRunCommand}>
          runCommand
        </button>
        <button type="button" onClick={handleNotify}>
          notify
        </button>
        <button type="button" onClick={handleReadProjectFile}>
          readProjectFile
        </button>
        <button type="button" onClick={handleWriteProjectFile}>
          writeProjectFile
        </button>
        <button type="button" onClick={handleRunScript}>
          runScript
        </button>
        <button type="button" onClick={handleGetClipboard}>
          getClipboard
        </button>
        <button type="button" onClick={handleSetClipboard}>
          setClipboard
        </button>
        <button type="button" onClick={handleGetActiveEditor}>
          getActiveEditor
        </button>
        <button type="button" onClick={handleGetActiveEditorWithContent}>
          getActiveEditor (content)
        </button>
        <button type="button" onClick={handleGetDiagnostics}>
          getDiagnostics
        </button>
        <button type="button" onClick={handleGetDiagnosticsOpenFiles}>
          getDiagnostics (open files)
        </button>
        <button type="button" onClick={handleGetTheme}>
          getTheme
        </button>
        <button type="button" onClick={handleOpenFile}>
          openFile
        </button>
        <button type="button" onClick={handleShowQuickPick}>
          showQuickPick
        </button>
      </div>
      <div className="log">
        {entries.map((e, i) => (
          <div key={i}>
            [{e.time}] {e.text}
          </div>
        ))}
      </div>
    </div>
  )
}
