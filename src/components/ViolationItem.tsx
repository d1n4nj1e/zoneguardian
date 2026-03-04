import { AlertTriangle, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { log } from '@/services/logger';

export interface Violation {
  id: string;
  type: 'boundary_exit' | 'boundary_enter' | 'speed';
  severity: 'low' | 'medium' | 'high';
  assetId: string;
  zoneName: string;
  timestamp: string;
  duration?: string;
  acknowledged: boolean;
}

interface ViolationItemProps {
  violation: Violation;
  onAck?: () => void; // 🔥 INI WAJIB ADA
}

export function ViolationItem({ violation, onAck }: ViolationItemProps) {
  const [ackSent, setAckSent] = useState(false);
  const severityConfig = {
    low: 'border-border bg-muted',
    medium: 'border-warning/30 bg-warning/5',
    high: 'border-destructive/30 bg-destructive/5',
  };

  const typeLabels = {
    boundary_exit: 'Boundary Exit',
    boundary_enter: 'Unauthorized Entry',
    speed: 'Speed Violation',
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-4 flex items-start gap-3',
        severityConfig[violation.severity]
      )}
    >
      <div className="p-2 rounded-lg bg-destructive/20 text-destructive">
        <AlertTriangle className="w-4 h-4" />
      </div>

      <div className="flex-1">
        <div className="font-semibold">
          {typeLabels[violation.type]}
        </div>

        <div className="text-sm text-muted-foreground mt-1">
          <span className="font-mono">{violation.assetId}</span> • {violation.zoneName}
        </div>

        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {violation.timestamp}
        </div>
      </div>

      {(!violation.acknowledged && !ackSent) && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            // OPTIMISTIC: hide immediately (local state)
            setAckSent(true)
            try {
              onAck?.()
              log('info', 'ViolationItem', 'Optimistic ACK sent', { id: violation.id })
            } catch (e) {
              log('error', 'ViolationItem', 'onAck handler threw', e)
            }

            // Perform backend ACK in background
            ;(async () => {
              try {
                const { error } = await supabase
                  .from('violations')
                  .update({ acknowledged: true })
                  .eq('id', violation.id)

                if (error) {
                  log('error', 'ViolationItem', 'ACK update failed', { id: violation.id, message: error.message })
                  alert('Failed to ACK on server: ' + error.message)
                  // revert optimistic hide if desired
                  setAckSent(false)
                } else {
                  log('info', 'ViolationItem', 'ACK persisted', { id: violation.id })
                }
              } catch (err) {
                log('error', 'ViolationItem', 'ACK exception', err)
                alert('Failed to ACK')
                setAckSent(false)
              }
            })()
          }}
        >
          ACK
        </Button>
      )}
    </div>
  );
}
