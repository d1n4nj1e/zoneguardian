import { NavLink, useLocation } from 'react-router-dom';
import { Map, ClipboardList, History, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles?: ('operator' | 'supervisor')[];
}

const navItems: NavItem[] = [
  { icon: Map, label: 'Operate', path: '/operate', roles: ['operator'] },
  { icon: Map, label: 'Monitor', path: '/supervise', roles: ['supervisor'] },
  { icon: Shield, label: 'Zones', path: '/zones', roles: ['supervisor'] },
  { icon: ClipboardList, label: 'Assign', path: '/assignments', roles: ['supervisor'] },
  { icon: History, label: 'History', path: '/history' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  
  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role || 'operator')
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[64px]',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className={cn('w-6 h-6', isActive && 'glow-primary')} />
              <span className={cn('text-xs font-medium', isActive && 'text-primary')}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}