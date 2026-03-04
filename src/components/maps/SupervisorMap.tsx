import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, GeoJSON, Marker } from 'react-leaflet'
import L from 'leaflet'
import type { Zone } from '@/types/zone'
import '@/lib/leafletIconFix'

type OperatorStatus = {
  id: string
  name: string
  asset: string
  status: 'safe' | 'warning' | 'danger' | 'offline'
  position?: [number, number] | null
  lastUpdate?: string
}

const statusColor: Record<OperatorStatus['status'], string> = {
  safe: 'green',
  warning: 'orange',
  danger: 'red',
  offline: 'gray',
}

function createOperatorIcon(status: OperatorStatus['status']) {
  const color = status === 'safe' ? '#10b981' : status === 'warning' ? '#f59e0b' : status === 'danger' ? '#ef4444' : '#94a3b8'
  return L.divIcon({
    className: 'operator-icon',
    html: `
      <div style="display:flex;align-items:center;justify-content:center;flex-direction:column">
        <div style="width:34px;height:34px;border-radius:50%;background:${color};box-shadow:0 4px 12px rgba(0,0,0,0.25);border:2px solid rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center">
          <div style="width:10px;height:10px;border-radius:50%;background:white;"></div>
        </div>
        <div style="width:8px;height:8px;margin-top:4px;border-radius:50%;background:${color};opacity:0.75"></div>
      </div>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 21],
  })
}

interface Props {
  operators: OperatorStatus[]
  violations: OperatorStatus[]
  selectedOperator?: OperatorStatus | null
  showLastKnownWhenOffline?: boolean
  zones?: Zone[]
}

export default function SupervisorMap({ operators, violations, selectedOperator, showLastKnownWhenOffline, zones }: Props) {
  const center: [number, number] = [-2.5583, 121.3616]

  return (
    <MapContainer
      center={center}
      zoom={15}
      minZoom={13}
      maxZoom={19}
      style={{ height: '100%', width: '100%' }}
    >
      {/* Fit bounds to all active zones when available */}
      {zones && zones.length > 0 && <ZonesFit zones={zones} />}
      {/* Focus helper lives inside map */}
      {selectedOperator ? (
        <MapFocus operator={selectedOperator} showLastKnownWhenOffline={showLastKnownWhenOffline} />
      ) : null}
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* ZONE POLYGONS (render first so they appear below markers) */}
      {zones && zones.map(zone => {
        if (!zone.polygon || !zone.zone_type) return null
        const zoneColor = zone.zone_type.color ?? '#6b7280'
        // Convert GeoJSON polygon to leaflet feature
        const geoJsonFeature = {
          type: 'Feature',
          geometry: zone.polygon,
          properties: { name: zone.name },
        }
        return (
          <GeoJSON
            key={zone.id}
            data={geoJsonFeature}
            style={() => ({
              color: zoneColor,
              opacity: 0.6,
              fillOpacity: 0.15,
              weight: 2,
            })}
            onEachFeature={(feature, layer) => {
              layer.bindPopup(zone.name)
            }}
          />
        )
      })}

      {/* ACTIVE ASSETS */}
      {operators.map(op => {
        // If operator has no position or is explicitly null, skip marker
        if (!op.position) return null

        // If selected operator is offline, parent may want to show last-known marker.
        const isSelectedOffline = op.status === 'offline' && selectedOperator && selectedOperator.id === op.id

        const color = statusColor[op.status]

        // Render standard marker for online operators
        if (!isSelectedOffline) {
          return (
            <Marker key={op.id} position={op.position} icon={createOperatorIcon(op.status)}>
              <Popup>
                <strong>{op.name}</strong>
                <br />
                Asset: {op.asset}
                {op.lastUpdate ? <><br />Last seen: {op.lastUpdate}</> : null}
              </Popup>
            </Marker>
          )
        }

        // If selected operator is offline, show a muted "last known" marker instead
        return (
          <Marker key={op.id} position={op.position} icon={createOperatorIcon('offline')}>
            <Popup>
              <strong>{op.name} (Last known)</strong>
              <br />
              Asset: {op.asset}
              {op.lastUpdate ? <><br />Last seen: {op.lastUpdate}</> : null}
            </Popup>
          </Marker>
        )
      })}

      {/* VIOLATIONS OVERLAY */}
      {violations.map(v => (
        v.position ? (
          <CircleMarker
            key={`violation-${v.id}`}
            center={v.position}
            radius={10}
            pathOptions={{
              color: statusColor[v.status],
              fillColor: statusColor[v.status],
              fillOpacity: 0.9,
            }}
          />
        ) : null
      ))}
    </MapContainer>
  )
}

// Helper component to pan/focus map when selected operator changes
export function MapFocus({
  operator,
  showLastKnownWhenOffline,
}: {
  operator?: OperatorStatus | null
  showLastKnownWhenOffline?: boolean
}) {
  const map = useMap()

  useEffect(() => {
    if (!operator) return
    // allow focusing offline operator only when parent requests last-known focus
    if (operator.status === 'offline' && !showLastKnownWhenOffline) return
    if (!operator.position) return
    try {
      map.setView(operator.position, 17, { animate: true })
    } catch (e) {
      // ignore
    }
  }, [operator, map, showLastKnownWhenOffline])

  return null
}

function ZonesFit({ zones }: { zones: Zone[] }) {
  const map = useMap()

  useEffect(() => {
    if (!zones || zones.length === 0) return

    let attempts = 0
    let timer: NodeJS.Timeout | null = null

    const collectCoords = () => {
      const allCoords: [number, number][] = []
      zones.forEach(z => {
        try {
          const geom = z.polygon
          if (!geom) return
          if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
            geom.coordinates.forEach((ring: any[]) => {
              ring.forEach((pt: any[]) => allCoords.push([pt[1], pt[0]]))
            })
          } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
            geom.coordinates.forEach((poly: any[]) => {
              poly.forEach((ring: any[]) => ring.forEach((pt: any[]) => allCoords.push([pt[1], pt[0]])))
            })
          }
        } catch {}
      })
      return allCoords
    }

    const tryFit = () => {
      if (!map) return
      const allCoords = collectCoords()
      if (allCoords.length === 0) return

      try {
        map.invalidateSize()

        // Ensure the map container is visible (width/height > 0) before fitting.
        const container = map.getContainer && map.getContainer()
        const rect = container && typeof container.getBoundingClientRect === 'function' ? container.getBoundingClientRect() : null
        const visible = rect ? rect.width > 20 && rect.height > 20 : true
        if (!visible) {
          attempts += 1
          if (attempts > 8) return
          timer = setTimeout(tryFit, 200)
          return
        }

        // Safe fit when map is ready
        const bounds = L.latLngBounds(allCoords as any)
        if (typeof map.whenReady === 'function') {
          map.whenReady(() => map.fitBounds(bounds, { padding: [32, 32] }))
        } else {
          map.fitBounds(bounds as any, { padding: [32, 32] })
        }
      } catch (e) {
        attempts += 1
        if (attempts <= 8) timer = setTimeout(tryFit, 200)
      }
    }

    timer = setTimeout(tryFit, 120)

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [zones, map])

  return null
}
