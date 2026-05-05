import { useEffect, useState } from 'react'
import { bridge } from '@unextension/bridge'

export function Panel() {
  const [lastReply, setLastReply] = useState<string | null>(null)

  useEffect(() => {
    return bridge.onMessage((msg) => {
      const m = msg as { type?: string; payload?: unknown }
      setLastReply(`[${m.type ?? 'unknown'}] ${JSON.stringify(m.payload ?? msg)}`)
    })
  }, [])

  return (
    <div style={{ padding: '1rem', fontFamily: 'system-ui' }}>
      <h2>🔧 Showcase Panel</h2>
      <button type="button" onClick={() => bridge.postMessage('panel-action', { text: 'Hello from the panel!' })}>
        Send panel message
      </button>
      {lastReply && (
        <p style={{ marginTop: '1rem', padding: '0.5rem', background: '#e8f5e9', borderRadius: '4px', fontFamily: 'monospace' }}>
          Reply: {lastReply}
        </p>
      )}
    </div>
  )
}
