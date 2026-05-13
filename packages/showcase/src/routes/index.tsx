import { useEffect, useState } from 'react'
import { bridge } from '@unextension/bridge'
import { KitchenSink } from '../components/KitchenSink'

export function Home() {
  const [log, setLog] = useState<string[]>([])

  useEffect(() => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ✅ JS loaded — bridge ready`, ...prev])
    return bridge.onMessage((msg) => {
      setLog((prev) => [
        `[${new Date().toLocaleTimeString()}] 📨 received: ${JSON.stringify(msg)}`,
        ...prev,
      ])
    })
  }, [])

  return (
    <div className="view">
      <h1>🧩 Unextension Showcase — Explorer</h1>
      <KitchenSink />
      <div className="log">
        {log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  )
}
