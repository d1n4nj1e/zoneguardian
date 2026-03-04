import LiveMap from '@/components/maps/LiveMap'
import { useState } from 'react'
import { cn } from '@/lib/utils'

type Status = 'safe' | 'warning' | 'danger'

export function GeofenceMap({ onStatusChange }: { onStatusChange?: (s: Status) => void }) {
  const [status, setStatus] = useState<Status>('safe')

  const handleStatusChange = (s: Status) => {
    setStatus(s)
    onStatusChange?.(s)
  }

  return (
    <div className="relative w-full h-[350px] rounded-xl overflow-hidden bg-muted">
      {/* MAP LAYER */}
      <div className="absolute inset-0 z-0">
        <LiveMap onStatusChange={handleStatusChange} />
      </div>

      {/* STATUS OVERLAY */}
      <div className="absolute z-10 bottom-4 left-4 bg-card/90 backdrop-blur rounded-lg px-4 py-2 border">
        <div className="text-xs text-muted-foreground">Current Status</div>
        <div
          className={cn(
            'font-bold text-lg',
            status === 'safe' && 'text-success',
            status === 'warning' && 'text-warning',
            status === 'danger' && 'text-destructive'
          )}
        >
          {status.toUpperCase()}
        </div>
      </div>
    </div>
  )
}
