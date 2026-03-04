import { useEffect, useState } from 'react'
import {
  Search,
  Plus,
  Check,
  MapPin,
  Clock,
  User,
  X,
} from 'lucide-react'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import AssignZoneModal from '@/components/assignments/AssignZoneModal'
import { toast } from 'sonner'

interface AssignmentUI {
  id: string
  assetId: string
  assetName: string
  zoneName: string
  shift: string
  status: 'active' | 'completed'
}

export default function AssignmentsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [assignments, setAssignments] = useState<AssignmentUI[]>([])
  const [loading, setLoading] = useState(true)
  const [openAssign, setOpenAssign] = useState(false)
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active')

  // =============================
  // LOAD ASSIGNMENTS (SOURCE OF TRUTH = DB)
  // =============================
  async function loadAssignments() {
    try {
      setLoading(true)

      const { data: assignmentRows, error } = await supabase
        .from('zone_assignments')
        .select('id, asset_id, zone_id, status, assigned_at')
        .order('assigned_at', { ascending: false })

      if (error) throw error

      if (!assignmentRows || assignmentRows.length === 0) {
        setAssignments([])
        return
      }

      const assetIds = [...new Set(assignmentRows.map(a => a.asset_id))]
      const zoneIds = [...new Set(assignmentRows.map(a => a.zone_id))]

      const [{ data: assets }, { data: zones }] = await Promise.all([
        supabase
          .from('assets')
          .select('id, name, asset_code')
          .in('id', assetIds),
        supabase
          .from('zones')
          .select('id, name')
          .in('id', zoneIds),
      ])

      const assetMap = Object.fromEntries(
        (assets ?? []).map(a => [
          a.id,
          a.name ?? a.asset_code ?? 'Unnamed Asset',
        ])
      )

      const zoneMap = Object.fromEntries(
        (zones ?? []).map(z => [z.id, z.name])
      )

      const adapted: AssignmentUI[] = assignmentRows.map(a => ({
        id: a.id,
        assetId: a.asset_id,
        assetName: assetMap[a.asset_id] ?? 'Unknown Asset',
        zoneName: zoneMap[a.zone_id] ?? 'Unknown Zone',
        shift: '06:00 - 18:00',
        status: a.status,
      }))

      setAssignments(adapted)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load assignments')
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssignments()
  }, [])

  // =============================
  // FILTER
  // =============================
  const filteredAssignments = assignments
    .filter(a =>
      viewMode === 'active'
        ? a.status === 'active'
        : a.status === 'completed'
    )
    .filter(
      a =>
        a.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.zoneName.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const stats = {
    active: assignments.filter(a => a.status === 'active').length,
    history: assignments.filter(a => a.status === 'completed').length,
  }

  const statusStyle = {
    active: 'bg-success/20 text-success',
    completed: 'bg-muted text-muted-foreground',
  }

  // =============================
  // UNASSIGN (SAFE)
  // =============================
  async function unassign(id: string) {
    try {
      const { error } = await supabase
        .from('zone_assignments')
        .update({ status: 'completed' })
        .eq('id', id)

      if (error) throw error

      toast.success('Assignment completed')
      loadAssignments()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to unassign')
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title="Assignments" />

      <main className="p-4 space-y-4">
        {/* SEARCH + ADD */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search asset or zone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-11 h-12 bg-card"
            />
          </div>
          <Button
            size="icon"
            className="h-12 w-12"
            onClick={() => setOpenAssign(true)}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* MODE SWITCH */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'active' ? 'default' : 'outline'}
            onClick={() => setViewMode('active')}
          >
            Active ({stats.active})
          </Button>
          <Button
            variant={viewMode === 'history' ? 'default' : 'outline'}
            onClick={() => setViewMode('history')}
          >
            History ({stats.history})
          </Button>
        </div>

        {/* LIST */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading assignments…
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No assignments found
            </div>
          ) : (
            filteredAssignments.map(a => (
              <div key={a.id} className="bg-card rounded-xl border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
                      {a.assetName
                        .split(' ')
                        .map(n => n[0])
                        .join('')}
                    </div>
                    <div>
                      <h4 className="font-semibold">{a.assetName}</h4>
                      <p className="text-xs text-muted-foreground font-mono">
                        {a.assetId.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-xs px-2 py-1 rounded-full font-medium',
                      statusStyle[a.status]
                    )}
                  >
                    {a.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{a.zoneName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    <span>{a.assetName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{a.shift}</span>
                  </div>
                </div>

                {a.status === 'active' && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => unassign(a.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Unassign
                    </Button>
                    <Button size="sm" className="flex-1" disabled>
                      <Check className="w-4 h-4 mr-1" />
                      Push
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      <BottomNav />

      <AssignZoneModal
        open={openAssign}
        onClose={() => setOpenAssign(false)}
        onSuccess={loadAssignments}
      />
    </div>
  )
}
