import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import type { ZoneType } from '@/types/zone'
import {
  loadZoneTypes,
  createZoneType,
  deleteZoneType,
  subscribeZoneTypeChanges,
} from '@/lib/zoneTypeService'

export default function ZoneTypeManagementPage() {
  const navigate = useNavigate()

  const [zoneTypes, setZoneTypes] = useState<ZoneType[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
  })

  // ===============================
  // INITIAL LOAD + REALTIME
  // ===============================
  useEffect(() => {
    async function init() {
      const data = await loadZoneTypes()
      setZoneTypes(data)
      setLoading(false)
    }

    init()

    const unsubscribe = subscribeZoneTypeChanges(setZoneTypes)
    return unsubscribe
  }, [])

  // ===============================
  // CREATE (OPTIMISTIC UPDATE)
  // ===============================
  async function handleCreate() {
    if (!formData.name.trim()) return

    const created = await createZoneType(
      formData.name,
      formData.color
    )

    if (!created) {
      toast.error('Failed to create zone type')
      return
    }

    setZoneTypes(prev => [...prev, created])

    toast.success('Zone type created')
    setShowDialog(false)
    setFormData({ name: '', color: '#3b82f6' })
  }

  // ===============================
  // DELETE (OPTIMISTIC UPDATE)
  // ===============================
  async function handleDelete(id: string) {
    const success = await deleteZoneType(id)

    if (!success) {
      toast.error('Cannot delete zone type')
      return
    }

    setZoneTypes(prev => prev.filter(z => z.id !== id))

    toast.success('Zone type deleted')
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          Loading...
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <AppHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">

          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">
                Zone Type Management
              </h1>
              <p className="text-muted-foreground">
                Create and manage zone types
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* BACK BUTTON */}
              <Button
                variant="outline"
                onClick={() => navigate('/zones')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Zones
              </Button>

              {/* NEW TYPE BUTTON */}
              <Button
                onClick={() => setShowDialog(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                New Zone Type
              </Button>
            </div>
          </div>

          {/* LIST */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {zoneTypes.map(type => (
              <div
                key={type.id}
                className="p-4 border rounded-lg bg-card flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: type.color }}
                  />
                  <div>
                    <div className="font-semibold">
                      {type.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {type.color}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingId(type.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CREATE DIALOG */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Zone Type</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label>Color</Label>
              <Input
                type="color"
                value={formData.color}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    color: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleCreate}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog
        open={deletingId !== null}
        onOpenChange={open => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Zone Type?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingId && handleDelete(deletingId)
              }
              className="bg-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  )
}
