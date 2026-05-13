import { useState } from 'react'
import {
  bridge,
  listProjectFiles,
  runCommand,
  notify,
  readProjectFile,
  writeProjectFile,
  runScript,
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
