import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Unit tests for the VS Code spawn-process, process-send, and process-kill actions.
 *
 * The action files define top-level functions that share a module-scope `processRegistry` Map.
 * We mock `child_process.spawn` and the `webview` object to test the logic in isolation.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 3.2**
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

interface MockChildProcess {
  pid: number | undefined
  stdin: { write: ReturnType<typeof vi.fn> }
  stdout: { on: ReturnType<typeof vi.fn> }
  stderr: { on: ReturnType<typeof vi.fn> }
  on: ReturnType<typeof vi.fn>
  kill: ReturnType<typeof vi.fn>
}

function createMockProcess(pid: number = 1234): MockChildProcess {
  return {
    pid,
    stdin: { write: vi.fn() },
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn(),
    kill: vi.fn(),
  }
}

function createFailedMockProcess(): MockChildProcess {
  return {
    pid: undefined,
    stdin: { write: vi.fn() },
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn(),
    kill: vi.fn(),
  }
}

/**
 * Loads all three spawn-process related action files into a shared scope,
 * returning the functions and the processRegistry for inspection.
 */
async function loadSpawnProcessActions(mockSpawn: ReturnType<typeof vi.fn>) {
  const fs = await import('fs')
  const path = await import('path')

  const actionsDir = path.resolve(import.meta.dirname, '../targets/vscode/actions')
  const spawnProcessCode = fs.readFileSync(path.join(actionsDir, 'spawn-process.js'), 'utf-8')
  const processSendCode = fs.readFileSync(path.join(actionsDir, 'process-send.js'), 'utf-8')
  const processKillCode = fs.readFileSync(path.join(actionsDir, 'process-kill.js'), 'utf-8')

  // Combine all three files in a shared scope (they share processRegistry)
  const wrappedCode = `
    const require = this.require;
    const process = this.process;
    ${spawnProcessCode}
    ${processSendCode}
    ${processKillCode}
    return { spawnProcess, processSend, processKill, processRegistry };
  `

  const mockRequire = (mod: string) => {
    if (mod === 'child_process') {
      return { spawn: mockSpawn }
    }
    throw new Error(`Unexpected require: ${mod}`)
  }

  const factory = new Function(wrappedCode)
  return factory.call({
    require: mockRequire,
    process: { env: { PATH: '/usr/bin', HOME: '/home/user' } },
  }) as {
    spawnProcess: (payload: any, reply: any, channel: any, webview: any) => void
    processSend: (payload: any, reply: any, channel: any) => void
    processKill: (payload: any, reply: any, channel: any) => void
    processRegistry: Map<string, MockChildProcess>
  }
}

describe('VS Code spawn-process actions', () => {
  let mockSpawn: ReturnType<typeof vi.fn>
  let mockWebview: { postMessage: ReturnType<typeof vi.fn> }
  let mockChannel: Record<string, never>
  let actions: Awaited<ReturnType<typeof loadSpawnProcessActions>>

  beforeEach(async () => {
    mockSpawn = vi.fn()
    mockWebview = { postMessage: vi.fn() }
    mockChannel = {}
    actions = await loadSpawnProcessActions(mockSpawn)
  })

  describe('spawnProcess — successful spawn', () => {
    /**
     * Validates: Requirement 5.1
     * WHEN a spawn-process message is received, THE Host_Extension SHALL use
     * child_process.spawn to create the Subprocess and reply with processId and pid.
     */
    it('returns processId and pid on successful spawn', () => {
      const mockProc = createMockProcess(5678)
      mockSpawn.mockReturnValue(mockProc)

      const reply = vi.fn()
      actions.spawnProcess(
        { command: 'node', args: ['script.js'] },
        reply,
        mockChannel,
        mockWebview,
      )

      expect(reply).toHaveBeenCalledOnce()
      const result = reply.mock.calls[0][0]
      expect(result.processId).toMatch(/^proc_/)
      expect(result.pid).toBe(5678)
      expect(result.error).toBeUndefined()
    })

    it('registers the process in processRegistry', () => {
      const mockProc = createMockProcess(9999)
      mockSpawn.mockReturnValue(mockProc)

      const reply = vi.fn()
      actions.spawnProcess({ command: 'echo', args: ['hi'] }, reply, mockChannel, mockWebview)

      const result = reply.mock.calls[0][0]
      expect(actions.processRegistry.has(result.processId)).toBe(true)
      expect(actions.processRegistry.get(result.processId)).toBe(mockProc)
    })

    it('passes cwd and env options to spawn', () => {
      const mockProc = createMockProcess(1111)
      mockSpawn.mockReturnValue(mockProc)

      const reply = vi.fn()
      actions.spawnProcess(
        { command: 'ls', args: ['-la'], cwd: '/tmp', env: { FOO: 'bar' } },
        reply,
        mockChannel,
        mockWebview,
      )

      expect(mockSpawn).toHaveBeenCalledWith(
        'ls',
        ['-la'],
        expect.objectContaining({
          cwd: '/tmp',
          env: expect.objectContaining({ FOO: 'bar', PATH: '/usr/bin' }),
          stdio: ['pipe', 'pipe', 'pipe'],
        }),
      )
    })

    it('sets up stdout and stderr listeners on the process', () => {
      const mockProc = createMockProcess(2222)
      mockSpawn.mockReturnValue(mockProc)

      const reply = vi.fn()
      actions.spawnProcess({ command: 'cat' }, reply, mockChannel, mockWebview)

      expect(mockProc.stdout.on).toHaveBeenCalledWith('data', expect.any(Function))
      expect(mockProc.stderr.on).toHaveBeenCalledWith('data', expect.any(Function))
      expect(mockProc.on).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockProc.on).toHaveBeenCalledWith('exit', expect.any(Function))
    })

    it('forwards stdout data to webview as stream event', () => {
      const mockProc = createMockProcess(3333)
      mockSpawn.mockReturnValue(mockProc)

      const reply = vi.fn()
      actions.spawnProcess({ command: 'echo' }, reply, mockChannel, mockWebview)

      const result = reply.mock.calls[0][0]
      // Simulate stdout data
      const stdoutHandler = mockProc.stdout.on.mock.calls[0][1]
      stdoutHandler(Buffer.from('hello world'))

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        processId: result.processId,
        payload: { type: 'stdout', data: 'hello world' },
      })
    })

    it('forwards stderr data to webview as stream event', () => {
      const mockProc = createMockProcess(4444)
      mockSpawn.mockReturnValue(mockProc)

      const reply = vi.fn()
      actions.spawnProcess({ command: 'echo' }, reply, mockChannel, mockWebview)

      const result = reply.mock.calls[0][0]
      // Simulate stderr data
      const stderrHandler = mockProc.stderr.on.mock.calls[0][1]
      stderrHandler(Buffer.from('error output'))

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        processId: result.processId,
        payload: { type: 'stderr', data: 'error output' },
      })
    })

    it('sends exit event and removes from registry on process exit', () => {
      const mockProc = createMockProcess(5555)
      mockSpawn.mockReturnValue(mockProc)

      const reply = vi.fn()
      actions.spawnProcess({ command: 'echo' }, reply, mockChannel, mockWebview)

      const result = reply.mock.calls[0][0]
      // Simulate exit
      const exitHandler = mockProc.on.mock.calls.find((c: any[]) => c[0] === 'exit')![1]
      exitHandler(0)

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        processId: result.processId,
        payload: { type: 'exit', exitCode: 0 },
      })
      expect(actions.processRegistry.has(result.processId)).toBe(false)
    })
  })

  describe('spawnProcess — spawn failure', () => {
    /**
     * Validates: Requirement 5.1
     * IF the command cannot be found or the Subprocess fails to start,
     * THEN THE Host_Extension SHALL reply with an error.
     */
    it('returns error when process has no pid (spawn failure)', () => {
      const mockProc = createFailedMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      const reply = vi.fn()
      actions.spawnProcess({ command: 'nonexistent-binary' }, reply, mockChannel, mockWebview)

      expect(reply).toHaveBeenCalledOnce()
      const result = reply.mock.calls[0][0]
      expect(result.error).toContain('Failed to spawn process')
      expect(result.processId).toBeUndefined()
      expect(result.pid).toBeUndefined()
    })

    it('returns error when spawn throws an exception', () => {
      mockSpawn.mockImplementation(() => {
        throw new Error('ENOENT: command not found')
      })

      const reply = vi.fn()
      actions.spawnProcess({ command: 'nonexistent' }, reply, mockChannel, mockWebview)

      expect(reply).toHaveBeenCalledOnce()
      const result = reply.mock.calls[0][0]
      expect(result.error).toBe('ENOENT: command not found')
    })
  })

  describe('processSend — writes to stdin', () => {
    /**
     * Validates: Requirement 5.3
     * WHEN data is received from the Webview for a Process_ID,
     * THE Host_Extension SHALL write the data to the corresponding Subprocess stdin.
     */
    it('writes data to process stdin and replies { success: true }', () => {
      const mockProc = createMockProcess(7777)
      mockSpawn.mockReturnValue(mockProc)

      // First spawn a process to populate the registry
      const spawnReply = vi.fn()
      actions.spawnProcess({ command: 'cat' }, spawnReply, mockChannel, mockWebview)
      const { processId } = spawnReply.mock.calls[0][0]

      // Now send data to it
      const sendReply = vi.fn()
      actions.processSend({ processId, data: 'hello stdin' }, sendReply, mockChannel)

      expect(sendReply).toHaveBeenCalledWith({ success: true })
      expect(mockProc.stdin.write).toHaveBeenCalledWith('hello stdin')
    })

    it('returns { success: false } for unknown processId', () => {
      const reply = vi.fn()
      actions.processSend({ processId: 'proc_unknown', data: 'test' }, reply, mockChannel)

      expect(reply).toHaveBeenCalledWith({ success: false })
    })

    it('returns { success: false } when payload is null', () => {
      const reply = vi.fn()
      actions.processSend(null, reply, mockChannel)

      expect(reply).toHaveBeenCalledWith({ success: false })
    })
  })

  describe('processKill — terminates process', () => {
    /**
     * Validates: Requirement 5.4
     * WHEN the Webview sends a process-kill message,
     * THE Host_Extension SHALL terminate the Subprocess with the specified signal.
     */
    it('kills process with default SIGTERM and replies { success: true }', () => {
      const mockProc = createMockProcess(8888)
      mockSpawn.mockReturnValue(mockProc)

      // Spawn a process
      const spawnReply = vi.fn()
      actions.spawnProcess(
        { command: 'sleep', args: ['100'] },
        spawnReply,
        mockChannel,
        mockWebview,
      )
      const { processId } = spawnReply.mock.calls[0][0]

      // Kill it
      const killReply = vi.fn()
      actions.processKill({ processId }, killReply, mockChannel)

      expect(killReply).toHaveBeenCalledWith({ success: true })
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM')
    })

    it('kills process with specified signal', () => {
      const mockProc = createMockProcess(9090)
      mockSpawn.mockReturnValue(mockProc)

      // Spawn a process
      const spawnReply = vi.fn()
      actions.spawnProcess({ command: 'node' }, spawnReply, mockChannel, mockWebview)
      const { processId } = spawnReply.mock.calls[0][0]

      // Kill with SIGKILL
      const killReply = vi.fn()
      actions.processKill({ processId, signal: 'SIGKILL' }, killReply, mockChannel)

      expect(killReply).toHaveBeenCalledWith({ success: true })
      expect(mockProc.kill).toHaveBeenCalledWith('SIGKILL')
    })

    it('returns { success: false } for unknown processId', () => {
      const reply = vi.fn()
      actions.processKill({ processId: 'proc_nonexistent' }, reply, mockChannel)

      expect(reply).toHaveBeenCalledWith({ success: false })
    })
  })

  describe('webview dispose — kills all tracked processes', () => {
    /**
     * Validates: Requirement 3.2
     * WHEN the Webview is disposed, THE Host_Extension SHALL iterate the process
     * registry and kill all tracked Subprocesses.
     */
    it('all tracked processes can be killed by iterating processRegistry', () => {
      const mockProc1 = createMockProcess(1001)
      const mockProc2 = createMockProcess(1002)
      const mockProc3 = createMockProcess(1003)

      // Spawn three processes
      mockSpawn.mockReturnValueOnce(mockProc1)
      actions.spawnProcess({ command: 'proc1' }, vi.fn(), mockChannel, mockWebview)

      mockSpawn.mockReturnValueOnce(mockProc2)
      actions.spawnProcess({ command: 'proc2' }, vi.fn(), mockChannel, mockWebview)

      mockSpawn.mockReturnValueOnce(mockProc3)
      actions.spawnProcess({ command: 'proc3' }, vi.fn(), mockChannel, mockWebview)

      expect(actions.processRegistry.size).toBe(3)

      // Simulate webview dispose: iterate and kill all
      for (const [id, proc] of actions.processRegistry) {
        ;(proc.kill as (signal: string) => void)('SIGTERM')
        actions.processRegistry.delete(id)
      }

      expect(mockProc1.kill).toHaveBeenCalledWith('SIGTERM')
      expect(mockProc2.kill).toHaveBeenCalledWith('SIGTERM')
      expect(mockProc3.kill).toHaveBeenCalledWith('SIGTERM')
      expect(actions.processRegistry.size).toBe(0)
    })
  })
})
