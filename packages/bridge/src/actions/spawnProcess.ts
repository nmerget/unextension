import { bridge } from '../index.js'

export interface SpawnProcessOptions {
  cwd?: string
  env?: Record<string, string>
}

export interface ProcessHandle {
  readonly processId: string
  readonly pid: number
  readonly stdout: ReadableStream<string>
  readonly stderr: ReadableStream<string>
  readonly exitCode: Promise<number>
  send(data: string): void
  kill(signal?: string): void
}

interface SpawnReply {
  processId?: string
  pid?: number
  error?: string
}

interface StreamEvent {
  type: 'stdout' | 'stderr' | 'exit'
  data?: string
  exitCode?: number
}

export async function spawnProcess(
  command: string,
  args: string[] = [],
  options: SpawnProcessOptions = {},
): Promise<ProcessHandle> {
  const reply = await bridge.request<SpawnReply>('spawn-process', {
    command,
    args,
    cwd: options.cwd,
    env: options.env,
  })

  if (reply.error) {
    throw new Error(reply.error)
  }

  const processId = reply.processId!
  const pid = reply.pid!

  let stdoutController: ReadableStreamDefaultController<string>
  let stderrController: ReadableStreamDefaultController<string>

  const stdout = new ReadableStream<string>({
    start(controller) {
      stdoutController = controller
    },
  })

  const stderr = new ReadableStream<string>({
    start(controller) {
      stderrController = controller
    },
  })

  let resolveExitCode: (code: number) => void
  const exitCode = new Promise<number>((resolve) => {
    resolveExitCode = resolve
  })

  const unsubscribe = bridge.subscribe(processId, (event: StreamEvent) => {
    switch (event.type) {
      case 'stdout':
        stdoutController.enqueue(event.data!)
        break
      case 'stderr':
        stderrController.enqueue(event.data!)
        break
      case 'exit':
        stdoutController.close()
        stderrController.close()
        resolveExitCode(event.exitCode ?? 1)
        unsubscribe()
        break
    }
  })

  return {
    processId,
    pid,
    stdout,
    stderr,
    exitCode,
    send(data: string) {
      bridge.postMessage('process-send', { processId, data })
    },
    kill(signal?: string) {
      bridge.postMessage('process-kill', { processId, signal })
    },
  }
}
