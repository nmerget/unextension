import { useEffect, useState } from 'react'
import { bridge } from '@unextension/bridge'

export function Home() {
  const [log, setLog] = useState<string[]>([])

  const append = (msg: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])

  useEffect(() => {
    append('✅ JS loaded — bridge ready')
    return bridge.onMessage((msg) => {
      append(`📨 received: ${JSON.stringify(msg)}`)
    })
  }, [])

  return (
    <div style={{ padding: '1.25rem', fontFamily: 'system-ui, sans-serif', maxWidth: '640px' }}>
      <h1 style={{ marginTop: 0, fontSize: '1.2rem' }}>🧩 Unextension Showcase</h1>
      <button type="button" onClick={() => {
        bridge.postMessage('ping', { from: 'showcase' })
        append('📤 sent: ping')
      }} style={{ padding: '0.4rem 0.9rem', cursor: 'pointer' }}>
        Send ping
      </button>
      <div style={{ marginTop: '1rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>
        {log.map((line, i) => <div key={i}>{line}</div>)}
      </div>
    </div>
  )
}
