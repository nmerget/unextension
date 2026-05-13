import { useEffect, useState } from 'react'
import { bridge } from '@unextension/bridge'
import { KitchenSink } from '../components/KitchenSink'

export function Panel() {
  const [log, setLog] = useState<string[]>([])

  useEffect(() => {
    return bridge.onMessage((msg) => {
      const m = msg as { type?: string; payload?: unknown }
      setLog((prev) => [
        `[${new Date().toLocaleTimeString()}] 📨 ${m.type ?? 'unknown'}: ${JSON.stringify(m.payload ?? msg)}`,
        ...prev,
      ])
    })
  }, [])

  return (
    <div className="view">
      <h1>🧩 Unextension Showcase — Panel</h1>
      <KitchenSink />
      <div className="log">
        {log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  )
}
