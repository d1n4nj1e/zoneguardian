import { Battery, Signal, Clock } from 'lucide-react';
import { StatusIndicator } from './StatusIndicator';

interface AppHeaderProps {
  title?: string;
  showStatus?: boolean;
  status?: 'safe' | 'warning' | 'danger' | 'offline';
}

export function AppHeader({ title = 'MineGuardian', showStatus = false, status = 'safe' }: AppHeaderProps) {
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <div className="w-4 h-4 bg-primary rounded-sm" />
          </div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">{title}</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {showStatus && <StatusIndicator status={status} size="sm" />}
          
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Signal className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1">
              <Battery className="w-4 h-4" />
              <span className="text-xs font-medium">87%</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">{currentTime}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
