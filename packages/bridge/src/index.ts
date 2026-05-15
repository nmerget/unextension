type MessageHandler = (message: unknown) => void

interface StreamEvent {
  type: 'stdout' | 'stderr' | 'exit'
  data?: string
  exitCode?: number
}

interface VsCodeApi {
  postMessage(msg: unknown): void
}

type HostWindow = Window & {
  __unextension_jb_bridge?: (message: string) => void
  acquireVsCodeApi?: () => VsCodeApi
}

interface Bridge {
  postMessage(type: string, payload?: unknown): void
  onMessage(handler: MessageHandler): () => void
  request<T = unknown>(type: string, payload?: unknown): Promise<T>
  subscribe(processId: string, handler: (event: StreamEvent) => void): () => void
}

function createBridge(): Bridge {
  const handlers = new Set<MessageHandler>()
  const pending = new Map<string, (payload: unknown) => void>()
  const subscriptions = new Map<string, (event: StreamEvent) => void>()

  let _vscodeApi: VsCodeApi | undefined | null = undefined

  function getHostWindow(): HostWindow | null {
    return typeof window !== 'undefined' ? (window as HostWindow) : null
  }

  function getVsCodeApi() {
    if (_vscodeApi !== undefined) return _vscodeApi
    _vscodeApi = getHostWindow()?.acquireVsCodeApi?.() ?? null
    return _vscodeApi ?? null
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('message', (event) => {
      const data = event.data as {
        type?: string
        payload?: unknown
        correlationId?: string
        processId?: string
      }

      // Existing: resolve pending request/reply
      if (data?.correlationId && pending.has(data.correlationId)) {
        pending.get(data.correlationId)!(data.payload)
        pending.delete(data.correlationId)
        return
      }

      // New: route stream events by processId
      if (data?.processId && subscriptions.has(data.processId)) {
        subscriptions.get(data.processId)!(data.payload as StreamEvent)
        return
      }

      // Existing: broadcast to generic handlers
      for (const handler of handlers) {
        handler(event.data)
      }
    })
  }

  function send(type: string, payload?: unknown, correlationId?: string) {
    if (typeof window === 'undefined') return
    const msg = { type, payload, ...(correlationId ? { correlationId } : {}) }
    const vscodeApi = getVsCodeApi()
    if (vscodeApi) {
      vscodeApi.postMessage(msg)
      return
    }
    const jbBridge = getHostWindow()?.__unextension_jb_bridge
    if (jbBridge) {
      jbBridge(JSON.stringify(msg))
      return
    }
    console.warn('[unextension] No bridge available')
  }

  return {
    postMessage(type, payload) {
      send(type, payload)
    },

    request<T = unknown>(type: string, payload?: unknown): Promise<T> {
      return new Promise((resolve) => {
        const correlationId = Math.random().toString(36).slice(2)
        pending.set(correlationId, (p) => resolve(p as T))
        send(type, payload, correlationId)
      })
    },

    onMessage(handler) {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },

    subscribe(processId: string, handler: (event: StreamEvent) => void): () => void {
      subscriptions.set(processId, handler)
      return () => {
        subscriptions.delete(processId)
      }
    },
  }
}

export const bridge = createBridge()
export { type Bridge, type MessageHandler, type StreamEvent }
export { listProjectFiles } from './actions/listProjectFiles.js'
export { runCommand } from './actions/runCommand.js'
export { notify } from './actions/notify.js'
export { readProjectFile } from './actions/readProjectFile.js'
export { writeProjectFile } from './actions/writeProjectFile.js'
export { runScript } from './actions/runScript.js'
export { getClipboard } from './actions/getClipboard.js'
export { setClipboard } from './actions/setClipboard.js'
export { getActiveEditor } from './actions/getActiveEditor.js'
export { getDiagnostics } from './actions/getDiagnostics.js'
export { getTheme } from './actions/getTheme.js'
export { openFile } from './actions/openFile.js'
export { showQuickPick } from './actions/showQuickPick.js'
export { spawnProcess } from './actions/spawnProcess.js'
export type { ListProjectFilesOptions } from './actions/listProjectFiles.js'
export type { RunCommandResult, RunCommandOptions, Shell } from './actions/runCommand.js'
export type { NotifyLevel } from './actions/notify.js'
export type { ReadProjectFileResult } from './actions/readProjectFile.js'
export type { WriteProjectFileResult } from './actions/writeProjectFile.js'
export type { RunScriptResult } from './actions/runScript.js'
export type { GetClipboardResult } from './actions/getClipboard.js'
export type { SetClipboardResult } from './actions/setClipboard.js'
export type { GetActiveEditorOptions, GetActiveEditorResult } from './actions/getActiveEditor.js'
export type {
  Diagnostic,
  GetDiagnosticsOptions,
  GetDiagnosticsResult,
  Severity,
} from './actions/getDiagnostics.js'
export type { ThemeResult, ThemeColors } from './actions/getTheme.js'
export type { OpenFileOptions, OpenFileResult } from './actions/openFile.js'
export type { QuickPickItem, QuickPickOptions, QuickPickResult } from './actions/showQuickPick.js'
export type { SpawnProcessOptions, ProcessHandle } from './actions/spawnProcess.js'
