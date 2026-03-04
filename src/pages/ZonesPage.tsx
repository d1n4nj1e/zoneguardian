import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Zone, ZoneType } from '@/types/zone'
import ZoneListItem from '@/components/zones/ZoneListItem'
import ZoneForm from '@/components/zones/ZoneForm'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Search, LayoutGrid, List, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import {
  loadActiveZones,
  subscribeZoneChanges,
  updateZone,
  deleteZone,
} from '@/lib/zoneService'
import {
  loadZoneTypes,
  subscribeZoneTypeChanges,
} from '@/lib/zoneTypeService'

const ZonesPage = () => {
  const [zones, setZones] = useState<Zone[]>([])
  const [zoneTypes, setZoneTypes] = useState<ZoneType[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const [isCreating, setIsCreating] = useState(false)
  const [deletingZone, setDeletingZone] = useState<Zone | null>(null)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)

  // ===============================
  // INITIAL LOAD + REALTIME
  // ===============================
  useEffect(() => {
    async function init() {
      setLoading(true)

      const [zonesData, types] = await Promise.all([
        loadActiveZones(),
        loadZoneTypes(),
      ])

      setZones(zonesData)
      setZoneTypes(types)
      setLoading(false)
    }

    init()

    const unsubZones = subscribeZoneChanges(setZones)
    const unsubTypes = subscribeZoneTypeChanges(setZoneTypes)

    return () => {
      unsubZones()
      unsubTypes()
    }
  }, [])

  // ===============================
  // DELETE (OPTIMISTIC)
  // ===============================
  const handleDeleteZone = async () => {
    if (!deletingZone) return

    const zoneId = deletingZone.id

    const success = await deleteZone(zoneId)

    if (!success) {
      toast.error('Failed to delete zone')
      return
    }

    setZones(prev => prev.filter(z => z.id !== zoneId))

    toast.success(`Zone "${deletingZone.name}" deleted`)
    setDeletingZone(null)
  }

  // ===============================
  // TOGGLE STATUS (OPTIMISTIC)
  // ===============================
  const handleToggleStatus = async (zone: Zone) => {
    const newStatus =
      zone.status === 'active' ? 'inactive' : 'active'

    const result = await updateZone(zone.id, {
      status: newStatus,
    })

    if (!result) {
      toast.error('Failed to update zone')
      return
    }

    setZones(prev =>
      prev.map(z =>
        z.id === zone.id
          ? { ...z, status: newStatus }
          : z
      )
    )

    toast.success(
      `Zone "${zone.name}" is now ${newStatus}`
    )
  }

  // ===============================
  // FILTERING
  // ===============================
  const filteredZones = zones.filter(zone => {
    const matchesSearch = zone.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())

    const matchesType =
      typeFilter === 'all' ||
      zone.zone_type_id === typeFilter

    const matchesStatus =
      statusFilter === 'all' ||
      zone.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  const activeZones = zones.filter(
    z => z.status === 'active'
  ).length

  // ===============================
  // CREATE MODE
  // ===============================
  if (isCreating) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <AppHeader />

        <ZoneForm
          onCancel={() => setIsCreating(false)}
          onSaved={(newZone) => {
            // 🔥 INSTANT ADD
            setZones(prev => [...prev, newZone])
            setIsCreating(false)
          }}
        />

        <BottomNav />
      </div>
    )
  }

  // Edit mode
  if (editingZone) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <AppHeader />

        <ZoneForm
          zone={editingZone}
          onCancel={() => setEditingZone(null)}
          onSaved={(updated) => {
            setZones(prev => prev.map(z => (z.id === updated.id ? updated : z)))
            setEditingZone(null)
            toast.success(`Zone "${updated.name}" updated`)
          }}
        />

        <BottomNav />
      </div>
    )
  }

  // ===============================
  // LIST MODE
  // ===============================
  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader />

      <main className="p-4 space-y-4">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-bold">
                Configure geofence boundaries
              </h2>
              <p className="text-sm text-muted-foreground">
                Active: {activeZones} / Total: {zones.length}
              </p>
            </div>
          </div>

          <Button
            onClick={() => setIsCreating(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Zone
          </Button>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search zones..."
              className="pl-10"
            />
          </div>

          <Select
            value={typeFilter}
            onValueChange={setTypeFilter}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Zone Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                All Types
              </SelectItem>

              {zoneTypes.map(zt => (
                <SelectItem key={zt.id} value={zt.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: zt.color,
                      }}
                    />
                    {zt.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                All
              </SelectItem>
              <SelectItem value="active">
                Active
              </SelectItem>
              <SelectItem value="inactive">
                Inactive
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-lg p-1">
            <Button
              size="sm"
              variant={
                viewMode === 'list'
                  ? 'secondary'
                  : 'ghost'
              }
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant={
                viewMode === 'grid'
                  ? 'secondary'
                  : 'ghost'
              }
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* LIST */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            Loading zones…
          </div>
        ) : filteredZones.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            No zones found
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredZones.map(zone => (
              <ZoneListItem
                key={zone.id}
                zone={zone}
                onEdit={(z) => setEditingZone(z)}
                onDelete={setDeletingZone}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />

      {/* DELETE CONFIRM */}
      <AlertDialog
        open={!!deletingZone}
        onOpenChange={open => {
          if (!open) setDeletingZone(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Zone
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "
              {deletingZone?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteZone}
              className="bg-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ZonesPage
