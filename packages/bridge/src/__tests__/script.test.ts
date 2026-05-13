import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createScript } from '../script.js'

describe('createScript', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let exitSpy: ReturnType<typeof vi.spyOn>
  const originalEnv = process.env['UNEXTENSION_PAYLOAD']

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (originalEnv === undefined) delete process.env['UNEXTENSION_PAYLOAD']
    else process.env['UNEXTENSION_PAYLOAD'] = originalEnv
  })

  it('parses payload from env and writes result as JSON', async () => {
    process.env['UNEXTENSION_PAYLOAD'] = JSON.stringify({ name: 'World' })
    await createScript(async (payload: { name: string }) => ({
      greeting: `Hello, ${payload.name}!`,
    }))
    expect(stdoutSpy).toHaveBeenCalledWith(JSON.stringify({ greeting: 'Hello, World!' }))
  })

  it('passes null payload when env var is not set', async () => {
    delete process.env['UNEXTENSION_PAYLOAD']
    await createScript(async (payload) => ({ received: payload }))
    expect(stdoutSpy).toHaveBeenCalledWith(JSON.stringify({ received: null }))
  })

  it('writes null for undefined return value', async () => {
    process.env['UNEXTENSION_PAYLOAD'] = 'null'
    await createScript(async () => undefined)
    expect(stdoutSpy).toHaveBeenCalledWith('null')
  })

  it('writes to stderr and exits with 1 on error', async () => {
    process.env['UNEXTENSION_PAYLOAD'] = 'null'
    await createScript(async () => {
      throw new Error('boom')
    })
    expect(stderrSpy).toHaveBeenCalledWith('boom')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
