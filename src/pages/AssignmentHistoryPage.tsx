import { useEffect, useState } from 'react';
import { Clock, MapPin, User } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';

interface HistoryItem {
  id: string;
  assetName: string;
  assetId: string;
  zoneName: string;
  status: string;
  assignedAt: string;
  unassignedAt: string | null;
  duration: string;
}

function formatDuration(start: string, end?: string | null) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();

  const diffMs = endDate.getTime() - startDate.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);

  return `${hours}h ${minutes}m`;
}

export default function AssignmentHistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);

    // 1️⃣ Load assignments
    const { data: rows, error } = await supabase
      .from('zone_assignments')
      .select('id, asset_id, zone_id, status, assigned_at, unassigned_at')
      .order('assigned_at', { ascending: false });

    if (error || !rows) {
      console.error(error);
      setLoading(false);
      return;
    }

    // 2️⃣ Collect IDs
    const assetIds = [...new Set(rows.map(r => r.asset_id))];
    const zoneIds = [...new Set(rows.map(r => r.zone_id))];

    // 3️⃣ Load assets & zones
    const { data: assets } = await supabase
      .from('assets')
      .select('id, name, asset_code')
      .in('id', assetIds);

    const { data: zones } = await supabase
      .from('zones')
      .select('id, name')
      .in('id', zoneIds);

    const assetMap = Object.fromEntries(
      (assets ?? []).map(a => [
        a.id,
        a.name ?? a.asset_code ?? 'Unnamed Asset',
      ])
    );

    const zoneMap = Object.fromEntries(
      (zones ?? []).map(z => [z.id, z.name])
    );

    // 4️⃣ Adapt for UI
    const adapted: HistoryItem[] = rows.map(r => ({
      id: r.id,
      assetId: r.asset_id,
      assetName: assetMap[r.asset_id] ?? 'Unknown Asset',
      zoneName: zoneMap[r.zone_id] ?? 'Unknown Zone',
      status: r.status,
      assignedAt: r.assigned_at,
      unassignedAt: r.unassigned_at,
      duration: formatDuration(r.assigned_at, r.unassigned_at),
    }));

    setItems(adapted);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title="Assignment History" />

      <main className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading history…
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No assignment history
          </div>
        ) : (
          items.map(h => (
            <div key={h.id} className="bg-card border rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold">{h.assetName}</h4>
                  <p className="text-xs font-mono text-muted-foreground">
                    {h.assetId.slice(0, 8)}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    h.status === 'active'
                      ? 'bg-success/20 text-success'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {h.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {h.zoneName}
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {h.assetName}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {h.duration}
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
}
