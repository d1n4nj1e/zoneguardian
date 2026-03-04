import { cn } from '@/lib/utils';

type Status = 'safe' | 'warning' | 'danger' | 'offline';

interface StatusIndicatorProps {
  status: Status;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const statusConfig = {
  safe: {
    color: 'bg-success',
    glow: 'glow-success',
    label: 'Inside Zone',
  },
  warning: {
    color: 'bg-warning',
    glow: 'glow-warning',
    label: 'Near Boundary',
  },
  danger: {
    color: 'bg-destructive',
    glow: 'glow-danger',
    label: 'Outside Zone',
  },
  offline: {
    color: 'bg-muted-foreground',
    glow: '',
    label: 'Offline',
  },
};

const sizeConfig = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function StatusIndicator({ status, label, size = 'md', pulse = true }: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <div className={cn('relative', sizeConfig[size])}>
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            config.color,
            config.glow,
            pulse && status !== 'offline' && 'status-pulse'
          )}
        />
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            config.color
          )}
        />
      </div>
      {label !== undefined ? (
        <span className="text-sm font-medium text-foreground">{label}</span>
      ) : (
        <span className="text-sm font-medium text-foreground">{config.label}</span>
      )}
    </div>
  );
}
