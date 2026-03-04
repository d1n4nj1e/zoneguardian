import { useEffect, useState } from 'react'
import { Navigation, AlertTriangle, Check } from 'lucide-react'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import { GeofenceMap } from '@/components/GeofenceMap'
import { StatusIndicator } from '@/components/StatusIndicator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  bindTrackingToAsset,
  startTracking,
  stopTracking,
} from '@/services/trackingService'

export default function OperatorDashboard() {
  const { user } = useAuth()

  const [status, setStatus] = useState<'safe' | 'warning' | 'danger'>('safe')
  const [zoneName, setZoneName] = useState<string | null>(null)
  const [assetName, setAssetName] = useState<string | null>(null)
  const [assetId, setAssetId] = useState<string | null>(null)

  async function loadAssignment() {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('zone_assignments')
        .select(`
          id,
          asset_id,
          assets!zone_assignments_asset_id_fkey (
            id,
            name,
            asset_code
          ),
          zones!zone_assignments_zone_id_fkey (
            id,
            name
          )
        `)
        .eq('operator_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (error) return

      if (!data) {
        setZoneName(null)
        setAssetName(null)
        setAssetId(null)

        stopTracking()
        return
      }

      const asset = data.assets as any
      const zone = data.zones as any
      const assignedAssetId = asset?.id ?? null

      setZoneName(zone?.name ?? null)
      setAssetName(asset?.name ?? asset?.asset_code ?? 'Unknown Asset')
      setAssetId(assignedAssetId)

      if (assignedAssetId) {
        bindTrackingToAsset(assignedAssetId)
        startTracking()
      }
    } catch {
      // silent fail
    }
  }

  useEffect(() => {
    if (!user?.id) return

    loadAssignment()

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
          loadAssignment()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      stopTracking()
    }
  }, [user?.id])

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title="Operate" showStatus status={status} />

      <main className="p-4 space-y-4">
        <div className="bg-card rounded-xl border p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">
                Current Assignment
              </p>

              <h2
                className={cn(
                  'text-lg font-bold',
                  !zoneName && 'text-warning'
                )}
              >
                {zoneName ?? 'No Active Assignment'}
              </h2>
            </div>

            <StatusIndicator status={status} size="lg" />
          </div>

          <div className="flex gap-4 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <Navigation className="w-4 h-4" />
              {assetName ?? 'No Asset Assigned'}
            </div>
          </div>
        </div>

        {zoneName && (
          <div
            className={cn(
              'rounded-xl p-4 border',
              status === 'safe' && 'bg-success/10 border-success/30',
              status === 'warning' && 'bg-warning/10 border-warning/30',
              status === 'danger' && 'bg-destructive/10 border-destructive/30'
            )}
          >
            <div className="flex items-center gap-3">
              {status === 'safe' ? (
                <Check className="w-6 h-6 text-success" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-warning" />
              )}

              <div>
                <p className="font-bold text-lg">
                  {status === 'safe'
                    ? 'Inside Zone'
                    : status === 'warning'
                    ? 'Near Boundary'
                    : 'Outside Zone'}
                </p>

                <p className="text-sm text-muted-foreground">
                  Real-time geofence monitoring
                </p>
              </div>
            </div>
          </div>
        )}

        {!zoneName && (
          <div className="rounded-xl p-6 border border-warning/30 bg-warning/5">
            <div className="text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-warning mx-auto" />

              <h3 className="font-semibold text-warning">
                Awaiting Zone Assignment
              </h3>

              <p className="text-sm text-muted-foreground">
                Your supervisor will assign you to a zone.
              </p>
            </div>
          </div>
        )}

        <div className="h-[350px]">
          <GeofenceMap onStatusChange={setStatus} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="industrial" size="lg">
            Log Event
          </Button>

          <Button variant="secondary" size="lg">
            Request Help
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
