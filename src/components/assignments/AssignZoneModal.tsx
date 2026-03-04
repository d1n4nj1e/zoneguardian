import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => Promise<void>
}

export default function AssignZoneModal({ open, onClose, onSuccess }: Props) {
  const { user } = useAuth()

  const [assetId, setAssetId] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [operatorId, setOperatorId] = useState('')

  const [loading, setLoading] = useState(false)

  const [assets, setAssets] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])
  const [operators, setOperators] = useState<any[]>([])

  const isSupervisor = user?.role === 'supervisor'

  // ==============================
  // LOAD DATA
  // ==============================
  useEffect(() => {
    if (!open) return

    async function load() {
      try {
        const [
          { data: assetsData, error: assetError },
          { data: zonesData, error: zoneError },
          { data: operatorData, error: operatorError },
        ] = await Promise.all([
          supabase
            .from('assets')
            .select('id, name, asset_code')
            .eq('status', 'active'),

          supabase
            .from('zones')
            .select('id, name')
            .eq('status', 'active'),

          // 🔥 FIX — NO full_name
          supabase
            .from('profiles')
            .select('id, email')
            .eq('role', 'operator'),
        ])

        if (assetError) throw assetError
        if (zoneError) throw zoneError
        if (operatorError) throw operatorError

        setAssets(assetsData ?? [])
        setZones(zonesData ?? [])
        setOperators(operatorData ?? [])
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to load data')
      }
    }

    load()
  }, [open])

  // ==============================
  // ASSIGN
  // ==============================
  async function handleAssign() {
    if (!isSupervisor) {
      toast.error('Only supervisor can assign asset')
      return
    }

    if (!assetId || !zoneId || !operatorId) {
      toast.error('Asset, zone, and operator must be selected')
      return
    }

    try {
      setLoading(true)

      // 🔥 CLOSE OLD ASSIGNMENTS (VERY IMPORTANT)
      await supabase
        .from('zone_assignments')
        .update({
          status: 'completed',
          unassigned_at: new Date().toISOString(),
        })
        .or(`asset_id.eq.${assetId},operator_id.eq.${operatorId}`)
        .eq('status', 'active')

      // 🔥 CREATE NEW
      const { error } = await supabase
        .from('zone_assignments')
        .insert({
          asset_id: assetId,
          zone_id: zoneId,
          operator_id: operatorId,
          status: 'active',
          assigned_at: new Date().toISOString(),
        })

      if (error) throw error

      toast.success('Assignment created')

      // reset
      setAssetId('')
      setZoneId('')
      setOperatorId('')

      await onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to assign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Zone</DialogTitle>
          <DialogDescription>
            Supervisor dispatches operator + asset into a zone
          </DialogDescription>
        </DialogHeader>

        {!isSupervisor && (
          <p className="text-sm text-destructive">
            You don’t have permission.
          </p>
        )}

        <div className="space-y-4">

          {/* ASSET */}
          <select
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="w-full border rounded-md p-2 bg-background text-foreground"
          >
            <option value="" disabled>Select Asset</option>

            {assets.map(a => (
              <option key={a.id} value={a.id}>
                {a.name ?? a.asset_code}
              </option>
            ))}
          </select>


          {/* OPERATOR */}
          <select
            value={operatorId}
            onChange={(e) => setOperatorId(e.target.value)}
            className="w-full border rounded-md p-2 bg-background text-foreground"
          >
            <option value="" disabled>Select Operator</option>

            {operators.map(o => (
              <option key={o.id} value={o.id}>
                {o.email}
              </option>
            ))}
          </select>


          {/* ZONE */}
          <select
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="w-full border rounded-md p-2 bg-background text-foreground"
          >
            <option value="" disabled>Select Zone</option>

            {zones.map(z => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>


          <Button
            className="w-full"
            onClick={handleAssign}
            disabled={loading}
          >
            {loading ? 'Assigning…' : 'Assign'}
          </Button>

        </div>
      </DialogContent>
    </Dialog>
  )
}
