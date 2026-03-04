import { AlertTriangle, Check, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Alert {
  id: string;
  type: 'boundary' | 'speed' | 'zone';
  severity: 'warning' | 'danger';
  message: string;
  location: string;
  time: string;
  acknowledged: boolean;
}

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
}

export function AlertCard({ alert, onAcknowledge }: AlertCardProps) {
  const severityConfig = {
    warning: {
      bg: 'bg-warning/10 border-warning/30',
      icon: 'text-warning',
      glow: 'glow-warning',
    },
    danger: {
      bg: 'bg-destructive/10 border-destructive/30',
      icon: 'text-destructive',
      glow: 'glow-danger',
    },
  };

  const config = severityConfig[alert.severity];

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all duration-200 animate-fade-in',
        config.bg,
        !alert.acknowledged && 'pulse-alert'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg', config.bg, config.glow)}>
          <AlertTriangle className={cn('w-5 h-5', config.icon)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{alert.message}</p>
          
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{alert.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{alert.time}</span>
            </div>
          </div>
        </div>

        {!alert.acknowledged && onAcknowledge && (
          <Button
            size="sm"
            variant={alert.severity === 'danger' ? 'destructive' : 'warning'}
            onClick={() => onAcknowledge(alert.id)}
            className="shrink-0"
          >
            <Check className="w-4 h-4 mr-1" />
            ACK
          </Button>
        )}

        {alert.acknowledged && (
          <div className="flex items-center gap-1 text-success text-sm font-medium">
            <Check className="w-4 h-4" />
            <span>Done</span>
          </div>
        )}
      </div>
    </div>
  );
}
