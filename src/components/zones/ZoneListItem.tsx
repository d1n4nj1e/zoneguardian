import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit2, MapPin, MoreVertical, Trash2 } from 'lucide-react'
import type { Zone } from '@/types/zone'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ZoneListItemProps {
  zone: Zone
  onEdit: (zone: Zone) => void
  onDelete: (zone: Zone) => void
  onToggleStatus: (zone: Zone) => void
}

const ZoneListItem = ({
  zone,
  onEdit,
  onDelete,
  onToggleStatus,
}: ZoneListItemProps) => {
  // Get type info from joined zone_type object
  const typeColor = zone.zone_type?.color ?? '#6b7280'
  const typeLabel = zone.zone_type?.name ?? 'Unknown Type'

  return (
    <div className="group flex items-center justify-between p-4 bg-card/50 border border-border/50 rounded-xl hover:bg-card/80 hover:border-primary/30 transition-all duration-200">
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${typeColor}20` }}
        >
          <MapPin className="w-6 h-6" style={{ color: typeColor }} />
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-foreground">
            {zone.name}
          </h3>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs font-medium"
              style={{
                borderColor: typeColor,
                color: typeColor,
              }}
            >
              {typeLabel}
            </Badge>

            <Badge
              variant={zone.status === 'active' ? 'default' : 'secondary'}
              className={`text-xs ${
                zone.status === 'active'
                  ? 'bg-success/20 text-success border-success/30'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {zone.status === 'active'
                ? 'Active'
                : 'Inactive'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="bg-popover border-border">
            <DropdownMenuItem onClick={() => onEdit(zone)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Zone
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onToggleStatus(zone)}>
              <MapPin className="w-4 h-4 mr-2" />
              {zone.status === 'active'
                ? 'Deactivate'
                : 'Activate'}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onDelete(zone)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Zone
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export default ZoneListItem
