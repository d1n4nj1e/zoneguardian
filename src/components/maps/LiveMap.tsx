import { MapContainer, TileLayer, Marker, Polygon } from 'react-leaflet'
import L, { type LatLngTuple } from 'leaflet'
import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getGeofenceStatus, getGeofenceStatusWithElevation } from '@/lib/geofence'
import { checkAndRecordViolation } from '@/services/violationEngine'
import { playAlarm, stopAlarm } from '@/services/alarmService'
import { subscribe, getTrackingState } from '@/services/trackingService'
import { log } from '@/services/logger'
import DebugPanel from '@/components/ui/DebugPanel'
import '@/lib/leafletIconFix'
import type { GeofenceStatus } from '@/lib/geofence'

type Status = 'safe' | 'warning' | 'danger'

const gpsIcon = L.divIcon({
  className: '',
  html: `
    <div style="position: relative; width: 20px; height: 20px;">
      <div style="
        position: absolute;
        inset: -10px;
        background: rgba(59,130,246,0.25);
        border-radius: 50%;
      "></div>
      <div style="
        position: absolute;
        inset: 0;
        background: #3b82f6;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 0 6px rgba(0,0,0,0.3);
      "></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

export default function LiveMap({
  onStatusChange,
}: {
  onStatusChange?: (s: Status) => void
}) {
  const { user } = useAuth()

  const [position, setPosition] = useState<LatLngTuple | null>(null)
  const [zone, setZone] = useState<LatLngTuple[] | null>(null)
  const [elevationEnabled, setElevationEnabled] = useState(false)
  const [minElevation, setMinElevation] = useState<number | null>(null)
  const [maxElevation, setMaxElevation] = useState<number | null>(null)

  const [assetId, setAssetId] = useState<string | null>(null)
  const [assignmentId, setAssignmentId] = useState<string | null>(null)

  const [status, setStatus] = useState<Status>('safe')
  const [loading, setLoading] = useState(true)
  const [showDebug, setShowDebug] = useState(false)
  const [elevation, setElevation] = useState<number | null>(null)
  const [showCoords, setShowCoords] = useState(true)
  const [coordsOpen, setCoordsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth <= 640)
  const [isSimulatedAlt, setIsSimulatedAlt] = useState<boolean>(false)

  const previousStatusRef = useRef<Status | null>(null)
  const violationCheckRef = useRef<NodeJS.Timeout | null>(null)

  // =========================
  // CLEANUP ON UNMOUNT
  // =========================
  useEffect(() => {
    return () => {
      console.log('[liveMap] Cleanup on unmount')
      if (violationCheckRef.current) {
        clearInterval(violationCheckRef.current)
      }
    }
  }, [])

  // =========================
  // STOP ALARM IF USER LOGOUT
  // =========================
  useEffect(() => {
    if (!user) {
      console.log('[liveMap] User logged out, stopping alarm')
      stopAlarm()
    }
  }, [user])

  // =========================
  // LOAD ASSIGNMENT
  // =========================
  const loadAssignment = useCallback(async () => {
    if (!user?.id) return

    console.log('[liveMap] Loading assignment for user:', user.id)
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('zone_assignments')
        .select(`
          id,
          asset_id,
          zones!zone_assignments_zone_id_fkey (
            polygon,
            elevation_enabled,
            min_elevation,
            max_elevation
          )
        `)
        .eq('operator_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (error) {
        console.error('[liveMap] Assignment load error:', error.message)
        setLoading(false)
        return
      }

      if (!data) {
        log('info', 'liveMap', 'No active assignment')
        stopAlarm()
        setAssetId(null)
        setAssignmentId(null)
        setZone(null)
        setLoading(false)
        return
      }

      log('info', 'liveMap', 'Assignment loaded', { assignmentId: data.id, assetId: data.asset_id })

      setAssetId(data.asset_id)
      setAssignmentId(data.id)

      const polygon = (data.zones as any)?.polygon

      if (!polygon) {
        log('warn', 'liveMap', 'No polygon data in zone')
        stopAlarm()
        setZone(null)
        setLoading(false)
        return
      }

      const converted: LatLngTuple[] =
        polygon.coordinates[0].map(
          ([lng, lat]: [number, number]) => [lat, lng]
        )

      // Extract elevation data from zone
      const zones = data.zones as any
      setElevationEnabled(zones?.elevation_enabled ?? false)
      setMinElevation(zones?.min_elevation ?? null)
      setMaxElevation(zones?.max_elevation ?? null)

      setZone(converted)
      setLoading(false)
    } catch (error) {
      log('error', 'liveMap', 'Exception loading assignment', error)
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadAssignment()

    // Listen for assignment changes
    if (!user?.id) return

    const channel = supabase
      .channel(`zone_assignments_operator_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zone_assignments',
          filter: `operator_id=eq.${user.id}`,
        },
        () => {
          console.log('[liveMap] Assignment changed, reloading')
          loadAssignment()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, loadAssignment])

  // =========================
  // SUBSCRIBE TO GPS POSITION
  // (from global tracking service)
  // =========================
  useEffect(() => {
    log('debug', 'liveMap', 'Subscribing to tracking service')

    // First, set current position if available
    const current = getTrackingState()
    if (current.position) {
      setPosition([current.position[0], current.position[1]])
      setElevation((current as any).altitude ?? null)
      setIsSimulatedAlt(!!(current as any).simulatedActive)
    }

    // Subscribe to future updates
    const unsubscribe = subscribe(state => {
      if (state.position) {
        setPosition([state.position[0], state.position[1]])
        setElevation((state as any).altitude ?? null)
        setIsSimulatedAlt(!!(state as any).simulatedActive)
      }
    })

    function onResize() {
      setIsMobile(window.innerWidth <= 640)
    }
    window.addEventListener('resize', onResize)

    return () => {
      log('debug', 'liveMap', 'Unsubscribe from tracking service')
      unsubscribe()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // =========================
  // REAL-TIME STATUS CHECK
  // (on every position update)
  // =========================
  useEffect(() => {
    if (!position || !zone || !assetId || !assignmentId) return

    // Get current status from geofence (with elevation if enabled)
    const newStatus = elevationEnabled
      ? (getGeofenceStatusWithElevation(
          position,
          zone,
          elevation,
          elevationEnabled,
          minElevation,
          maxElevation
        ) as Status)
      : (getGeofenceStatus(position, zone) as Status)

    // Update UI immediately
    setStatus(newStatus)

    // Play alarm if status changed
    if (previousStatusRef.current !== newStatus) {
      log('info', 'liveMap', 'Status changed', { from: previousStatusRef.current, to: newStatus })
      playAlarm(newStatus)
      previousStatusRef.current = newStatus
      onStatusChange?.(newStatus)

      // If we've just crossed INTO danger, record immediately to DB
      if (newStatus === 'danger') {
        ;(async () => {
          try {
            log('info', 'liveMap', 'Immediate violation record on crossing to danger')
            const r = await checkAndRecordViolation(
              assignmentId,
              assetId,
              position,
              zone,
              elevation,
              elevationEnabled,
              minElevation,
              maxElevation
            )
            log('info', 'liveMap', 'Immediate record result', r)
          } catch (err) {
            log('error', 'liveMap', 'Immediate violation record failed', err)
          }
        })()
      }
    }
  }, [position, zone, onStatusChange, elevationEnabled, minElevation, maxElevation, elevation])

  // =========================
  // VIOLATION RECORDING (less frequent)
  // (every 10 seconds to database)
  // =========================
  useEffect(() => {
    if (!position || !zone || !assetId || !assignmentId) {
      // Clear interval if no valid data
      if (violationCheckRef.current) {
        clearInterval(violationCheckRef.current)
        violationCheckRef.current = null
      }
      return
    }

    log('debug', 'liveMap', 'Setting up violation recording interval')

    // Record violations less frequently (every 10 seconds)
    // to avoid excessive DB writes while keeping UI responsive
    violationCheckRef.current = setInterval(async () => {
      try {
        const result = await checkAndRecordViolation(
          assignmentId,
          assetId,
          position,
          zone,
          elevation,
          elevationEnabled,
          minElevation,
          maxElevation
        )

        log('debug', 'liveMap', 'Violation check result', {
          triggered: result.triggered,
          previousStatus: result.previousStatus,
          currentStatus: result.currentStatus,
        })
      } catch (error) {
        console.error('[liveMap] Violation recording error:', error)
      }
    }, 10000)

    return () => {
      if (violationCheckRef.current) {
        clearInterval(violationCheckRef.current)
        violationCheckRef.current = null
      }
    }
  }, [position, zone, assetId, assignmentId, elevationEnabled, minElevation, maxElevation, elevation])

  // =========================
  // UI STATES
  // =========================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading assignment…
      </div>
    )
  }

  if (!assetId) {
    return (
      <div className="flex items-center justify-center h-full text-warning text-center">
        <div>
          <p className="font-semibold">No Asset Assigned</p>
          <p className="text-sm text-muted-foreground">
            Contact supervisor to receive assignment
          </p>
        </div>
      </div>
    )
  }

  if (!position) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Waiting for GPS signal…
      </div>
    )
  }

  if (!zone) {
    return (
      <div className="flex items-center justify-center h-full text-warning">
        No Active Zone
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <MapContainer
        center={position}
        zoom={17}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Polygon
          positions={zone}
          pathOptions={{
            color:
              status === 'safe'
                ? 'green'
                : status === 'warning'
                ? 'orange'
                : 'red',
            fillOpacity: 0.2,
          }}
        />

        <Marker position={position} icon={gpsIcon} />
      </MapContainer>

      {/* Compact coordinates / altitude card (collapsed on mobile) */}
      {isMobile ? (
        <>
          {!coordsOpen ? (
            <button
              onClick={() => setCoordsOpen(true)}
              title="Show position"
              style={{
                position: 'absolute',
                left: 12,
                bottom: 88,
                zIndex: 800,
                background: 'rgba(17,24,39,0.95)',
                color: 'white',
                width: 46,
                height: 46,
                borderRadius: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(2,6,23,0.6)',
                border: 'none',
              }}
            >
              <MapPin size={18} />
            </button>
          ) : (
            <div
              style={{
                position: 'absolute',
                left: 12,
                bottom: 80,
                zIndex: 700,
                background: 'rgba(17,24,39,0.95)',
                color: 'white',
                padding: '8px 10px',
                borderRadius: 10,
                minWidth: 160,
                boxShadow: '0 6px 18px rgba(2,6,23,0.6)',
              }}
              aria-live="polite"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Position</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {position ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      Alt: {elevation == null ? '—' : `${elevation.toFixed(1)} m`}
                    </div>
                    {isSimulatedAlt && (
                      <div style={{ fontSize: 11, padding: '2px 6px', background: '#f59e0b', color: '#0b1220', borderRadius: 999 }}>
                        Simulated
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    onClick={async () => {
                      const text = position ? `${position[0].toFixed(6)},${position[1].toFixed(6)}` : ''
                      try { if (text) await navigator.clipboard.writeText(text) } catch (e) { console.log('clipboard write failed', e) }
                    }}
                    title="Copy coordinates"
                    style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.06)', padding: '6px 8px', borderRadius: 8, fontSize: 12 }}
                  >
                    Copy
                  </button>

                  <button
                    onClick={() => setCoordsOpen(false)}
                    title="Close"
                    style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.06)', padding: '6px 8px', borderRadius: 8, fontSize: 12 }}
                  >
                    Close
                  </button>
                </div>
              </div>

              {showCoords && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                  <div>Lat: {position ? position[0].toFixed(6) : '—'}</div>
                  <div>Lng: {position ? position[1].toFixed(6) : '—'}</div>
                  <div>Alt: {elevation == null ? '—' : `${elevation.toFixed(2)} m`}</div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            position: 'absolute',
            left: 12,
            bottom: 80,
            zIndex: 700,
            background: 'rgba(17,24,39,0.9)',
            color: 'white',
            padding: '8px 10px',
            borderRadius: 10,
            minWidth: 140,
            boxShadow: '0 6px 18px rgba(2,6,23,0.6)',
            cursor: 'default',
          }}
          aria-live="polite"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Position</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {position ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : '—'}
              </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      Alt: {elevation == null ? '—' : `${elevation.toFixed(1)} m`}
                    </div>
                    {isSimulatedAlt && (
                      <div style={{ fontSize: 11, padding: '2px 6px', background: '#f59e0b', color: '#0b1220', borderRadius: 999 }}>
                        Simulated
                      </div>
                    )}
                  </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                onClick={async () => {
                  const text = position ? `${position[0].toFixed(6)},${position[1].toFixed(6)}` : ''
                  try { if (text) await navigator.clipboard.writeText(text) } catch (e) { console.log('clipboard write failed', e) }
                }}
                title="Copy coordinates"
                style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.06)', padding: '6px 8px', borderRadius: 8, fontSize: 12 }}
              >
                Copy
              </button>

              <button
                onClick={() => setShowCoords(s => !s)}
                title="Toggle details"
                style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.06)', padding: '6px 8px', borderRadius: 8, fontSize: 12 }}
              >
                {showCoords ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {showCoords && (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
              <div>Lat: {position ? position[0].toFixed(6) : '—'}</div>
              <div>Lng: {position ? position[1].toFixed(6) : '—'}</div>
              <div>Alt: {elevation == null ? '—' : `${elevation.toFixed(2)} m`}</div>
            </div>
          )}
        </div>
      )}

      {/* Floating debug toggle */}
      <div style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 600 }}>
        <button
          onClick={() => setShowDebug(s => !s)}
          style={{
            background: '#111827',
            color: 'white',
            padding: '8px 12px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            border: 'none'
          }}
        >
          {showDebug ? 'Close Debug' : 'Show Debug'}
        </button>
      </div>

      {showDebug && <DebugPanel onClose={() => setShowDebug(false)} />}
    </div>
  )
}
