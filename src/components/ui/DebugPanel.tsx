import React, { useEffect, useState } from 'react'
import { subscribeLogs, clearLogs, getLogs } from '@/services/logger'
import { setSimulatedAltitude, getTrackingState } from '@/services/trackingService'

export default function DebugPanel({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState(() => getLogs())
  const [altInput, setAltInput] = useState('')
  const [currentAlt, setCurrentAlt] = useState<number | null>(() => (getTrackingState() as any).altitude ?? null)
  const [currentSimulated, setCurrentSimulated] = useState<boolean>(() => !!((getTrackingState() as any).simulatedActive))
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth <= 640)

  useEffect(() => {
    const unsub = subscribeLogs(list => setEntries(list))
    return () => unsub()
  }, [])

  useEffect(() => {
    // poll current altitude & simulated flag briefly to show live status
    const id = setInterval(() => {
      const s = getTrackingState() as any
      setCurrentAlt(s.altitude ?? null)
      setCurrentSimulated(!!s.simulatedActive)
    }, 500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= 640)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const containerStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        left: 8,
        right: 8,
        top: 8,
        height: '45%',
        background: 'rgba(10,11,13,0.98)',
        color: 'white',
        borderRadius: 12,
        padding: 12,
        zIndex: 9999,
        overflow: 'auto',
        boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
      }
    : {
        position: 'fixed',
        right: 12,
        bottom: 12,
        width: '92%',
        maxWidth: 540,
        maxHeight: '70%',
        background: 'rgba(10,11,13,0.95)',
        color: 'white',
        borderRadius: 8,
        padding: 12,
        zIndex: 9999,
        overflow: 'auto',
        boxShadow: '0 6px 20px rgba(0,0,0,0.5)'
      }

  function applyAltInput() {
    const v = altInput.trim()
    if (!v) return
    const parsed = parseFloat(v)
    if (Number.isNaN(parsed)) return
    setSimulatedAltitude(parsed)
    setAltInput('')
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Debug Logs</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              Alt: {currentAlt === null ? '—' : currentAlt.toFixed(2)} m
            </div>
            {currentSimulated && (
              <div style={{ fontSize: 11, padding: '2px 6px', background: '#f59e0b', color: '#0b1220', borderRadius: 999 }}>
                Simulated
              </div>
            )}
          </div>
          {!isMobile && (
            <>
              <input
                type="number"
                inputMode="decimal"
                placeholder="Sim alt (m)"
                value={altInput}
                onChange={e => setAltInput(e.target.value)}
                style={{ width: 120, marginRight: 8 }}
                aria-label="Simulated altitude"
              />
              <button onClick={() => { applyAltInput() }} style={{ marginRight: 8 }}>Set Alt</button>
              <button onClick={() => { setSimulatedAltitude(null); setAltInput('') }} style={{ marginRight: 8 }}>Clear Alt</button>
            </>
          )}
          <button onClick={() => clearLogs()} style={{ marginRight: 8 }}>Clear</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>

      {isMobile && (
        <div style={{ marginBottom: 8 }}>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Enter altitude in meters and press Enter"
            value={altInput}
            onChange={e => setAltInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { applyAltInput() } }}
            style={{ width: '100%', padding: '12px 10px', fontSize: 16, borderRadius: 8, marginBottom: 8 }}
            aria-label="Simulated altitude mobile"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => applyAltInput()} style={{ flex: 1, padding: '10px 12px', borderRadius: 8 }}>Set Alt</button>
            <button onClick={() => { setSimulatedAltitude(null); setAltInput('') }} style={{ flex: 1, padding: '10px 12px', borderRadius: 8 }}>Clear</button>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, lineHeight: '1.2' }}>
        {entries.length === 0 && <div style={{ opacity: 0.6 }}>No logs yet</div>}
        {entries.map(e => (
          <div key={e.ts + e.level} style={{ marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>
              {new Date(e.ts).toLocaleTimeString()} • <strong>{e.tag}</strong> • <span style={{ textTransform: 'uppercase' }}>{e.level}</span>
            </div>
            <div style={{ marginTop: 4 }}>{e.message}</div>
            {e.meta && <pre style={{ marginTop: 6, background: 'rgba(255,255,255,0.02)', padding: 6, fontSize: 11, overflowX: 'auto' }}>{JSON.stringify(e.meta, null, 2)}</pre>}
          </div>
        ))}
      </div>
    </div>
  )
}
