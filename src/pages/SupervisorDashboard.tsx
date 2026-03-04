import { useEffect, useState, useMemo } from 'react'
import { AlertTriangle, ChevronRight, ChevronDown } from 'lucide-react'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import { StatusIndicator } from '@/components/StatusIndicator'
import SupervisorMap from '@/components/maps/SupervisorMap'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import {
  loadUnacknowledgedViolations,
  subscribeViolationChanges,
} from '@/lib/violationService'
import { computeOperatorStatus } from '@/lib/operator'
import { Zone, loadActiveZones, subscribeZoneChanges } from '@/lib/zoneService'

interface OperatorStatus {
  id: string
  name: string
  asset: string
  zone: string
  status: 'safe' | 'warning' | 'danger' | 'offline'
  lastUpdate: string
  position?: [number, number] | null
  lastSeenRaw?: string | null
}

export default function SupervisorDashboard() {
  const [operators, setOperators] = useState<OperatorStatus[]>([])
  const [violations, setViolations] = useState<OperatorStatus[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [collapsedZones, setCollapsedZones] = useState<Record<string, boolean>>({})
  const [selectedOperator, setSelectedOperator] = useState<OperatorStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAssets() {
      setLoading(true)

      const { data, error } = await supabase
        .from('zone_assignments')
        .select(`
          id,
          operator_id,
          asset_id,
          last_status,
          zones!zone_assignments_zone_id_fkey (
            id,
            name
          ),
          assets!zone_assignments_asset_id_fkey (
            id,
            name,
            asset_code,
            lat,
            lng,
            last_seen
          )
        `)
        .eq('status', 'active')

      if (error) {
        console.error('ASSIGNMENT LOAD ERROR:', error)
        setOperators([])
        setLoading(false)
        return
      }

      if (!data) {
        setOperators([])
        setLoading(false)
        return
      }

      const adapted: OperatorStatus[] = data.map((row: any) => {
        const asset = row.assets
        const zone = row.zones

        const position =
          asset?.lat != null && asset?.lng != null
            ? [asset.lat, asset.lng]
            : undefined

        const lastSeen = asset?.last_seen ?? null
        const status = computeOperatorStatus(row.last_status, lastSeen)

        return {
          id: row.operator_id ?? row.asset_id,
          name: asset?.name ?? asset?.asset_code ?? 'Unknown',
          asset: row.asset_id,
          zone: zone?.name ?? 'Unassigned',
          status,
          lastUpdate: lastSeen
            ? new Date(lastSeen).toLocaleTimeString()
            : 'No live GPS data',
          position,
          lastSeenRaw: lastSeen,
        }
      })

      setOperators(adapted)
      setLoading(false)
    }

    async function loadViolations() {
      const raw = await loadUnacknowledgedViolations()

      setViolations(
        raw.map(v => ({
          id: v.asset_id,
          name: v.asset_id,
          asset: v.asset_id,
          zone: v.zone_name ?? 'Unknown',
          status: v.status as any,
          lastUpdate: new Date(v.created_at).toLocaleTimeString(),
          position: [v.lat, v.lng],
        }))
      )
    }

    async function loadZones() {
      const z = await loadActiveZones()
      setZones(z)
    }

    loadAssets()
    loadViolations()
    loadZones()

    const unsubViolations = subscribeViolationChanges(
      v => {
        setViolations(prev => {
          const map = new Map(prev.map(o => [o.id, o]))
          map.set(v.asset_id, {
            id: v.asset_id,
            name: v.asset_id,
            asset: v.asset_id,
            zone: v.zone_name ?? 'Unknown',
            status: v.status as any,
            lastUpdate: new Date(v.created_at).toLocaleTimeString(),
            position: [v.lat, v.lng],
          })
          return Array.from(map.values())
        })
      },
      id => {
        setViolations(prev => prev.filter(o => o.id !== id))
      }
    )

    const unsubZones = subscribeZoneChanges(setZones)

    return () => {
      unsubViolations?.()
      unsubZones?.()
    }
  }, [])

  const grouped = useMemo(() => {
    const groups: Record<string, OperatorStatus[]> = {}

    operators.forEach(op => {
      if (!groups[op.zone]) groups[op.zone] = []
      groups[op.zone].push(op)
    })

    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [operators])

  function toggleZone(zoneName: string) {
    setCollapsedZones(prev => ({
      ...prev,
      [zoneName]: !prev[zoneName],
    }))
  }

  const stats = {
    total: operators.length,
    active: operators.length,
    warnings: violations.filter(v => v.status === 'warning').length,
    violations: violations.filter(v => v.status === 'danger').length,
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title="Monitor" />

      <main className="p-4 space-y-4">

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Active', value: stats.active },
            { label: 'Warnings', value: stats.warnings },
            { label: 'Violations', value: stats.violations },
          ].map(stat => (
            <div key={stat.label} className="bg-card rounded-xl border p-3 text-center">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {!loading && (
          <div className="h-[280px]">
            <SupervisorMap
              operators={operators}
              violations={violations}
              selectedOperator={selectedOperator}
              zones={zones}
              showLastKnownWhenOffline
            />
          </div>
        )}

        <div className="space-y-4">
          {grouped.map(([zoneName, ops]) => (
            <div key={zoneName} className="space-y-2">

              <div
                onClick={() => toggleZone(zoneName)}
                className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer bg-muted/40"
              >
                <div className="flex items-center gap-2">
                  {collapsedZones[zoneName] ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  <span className="font-semibold">{zoneName}</span>
                  <span className="text-xs text-muted-foreground">
                    ({ops.length})
                  </span>
                </div>
              </div>

              {!collapsedZones[zoneName] &&
                ops.map(op => (
                  <div
                    key={op.id}
                    onClick={() => setSelectedOperator(op)}
                    className={cn(
                      "bg-card rounded-xl border p-4 cursor-pointer transition",
                      selectedOperator?.id === op.id && "border-primary"
                    )}
                  >
                    <div className="flex justify-between">
                      <div>
                        <div className="font-semibold">{op.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {op.status === 'offline'
                            ? 'No live GPS data'
                            : `Last seen: ${op.lastUpdate}`}
                        </div>
                      </div>
                      <StatusIndicator status={op.status} size="sm" />
                    </div>
                  </div>
                ))}
            </div>
          ))}

          {!loading && operators.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No active assets
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
