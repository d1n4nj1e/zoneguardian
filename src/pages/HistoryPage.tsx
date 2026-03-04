import { useEffect, useState } from 'react'
import { Search, Filter, Calendar } from 'lucide-react'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import { ViolationItem, Violation } from '@/components/ViolationItem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  loadUnacknowledgedViolations,
  subscribeViolationChanges,
} from '@/lib/violationService'
import { useAuth } from '@/contexts/AuthContext'

export default function HistoryPage() {
  const { profile } = useAuth()

  const isSupervisor = profile?.role === 'supervisor'

  const [searchQuery, setSearchQuery] = useState('')
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    async function init() {
      setLoading(true)

      const raw = await loadUnacknowledgedViolations()

      const adapted: Violation[] = raw.map(v => ({
        id: v.id,
        type: 'boundary_exit',
        severity: 'high',
        assetId: v.asset_id ?? 'UNKNOWN',
        zoneName: 'Assigned Geofence',
        timestamp: new Date(v.created_at).toLocaleString(),
        duration: '-',
        acknowledged: false,
      }))

      setViolations(adapted)
      setLoading(false)

      unsubscribe = subscribeViolationChanges(
        v => {
          setViolations(prev => [
            {
              id: v.id,
              type: 'boundary_exit',
              severity: 'high',
              assetId: v.asset_id ?? 'UNKNOWN',
              zoneName: 'Assigned Geofence',
              timestamp: new Date(v.created_at).toLocaleString(),
              duration: '-',
              acknowledged: false,
            },
            ...prev,
          ])
        },
        id => {
          setViolations(prev =>
            prev.filter(item => item.id !== id)
          )
        }
      )
    }

    init()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const visibleViolations = violations.filter(
    v =>
      v.assetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.zoneName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: visibleViolations.length,
    high: visibleViolations.length,
    unacknowledged: visibleViolations.length,
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title="History" />

      <main className="p-4 space-y-4">
        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by asset, zone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-11 h-12"
            />
          </div>
          <Button variant="secondary" size="icon">
            <Filter className="w-5 h-5" />
          </Button>
          <Button variant="secondary" size="icon">
            <Calendar className="w-5 h-5" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-xl border p-3 text-center">
            <div className="text-xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="bg-card rounded-xl border p-3 text-center">
            <div className="text-xl font-bold text-destructive">
              {stats.high}
            </div>
            <div className="text-xs text-muted-foreground">High</div>
          </div>
          <div className="bg-card rounded-xl border p-3 text-center">
            <div className="text-xl font-bold text-warning">
              {stats.unacknowledged}
            </div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading violations…
            </div>
          ) : visibleViolations.length > 0 ? (
            visibleViolations.map(v => (
              <ViolationItem
                key={v.id}
                violation={v}

                // 🔥 supervisor only
                onAck={
                  isSupervisor
                    ? () => {
                        setViolations(prev =>
                          prev.filter(item => item.id !== v.id)
                        )
                      }
                    : undefined
                }
              />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No active violations
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
