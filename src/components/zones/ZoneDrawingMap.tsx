import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { ZonePoint } from '@/types/zone';
import { Button } from '@/components/ui/button';
import { Trash2, Undo2, MousePointer2, Maximize2, X } from 'lucide-react';

function createNumberedIcon(number: number, color: string = '#3b82f6') {
  // compact circular marker with number centered
  return L.divIcon({
    className: 'numbered-marker',
    html: `
      <div style="
        width: 22px;
        height: 22px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.25);
        font-weight: 600;
        color: white;
        font-size: 11px;
      ">${number}</div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
}

interface Props {
  points: ZonePoint[];
  onPointsChange: (points: ZonePoint[]) => void;
  zoneTypeColor?: string;
  isDrawing: boolean;
  onDrawingChange: (v: boolean) => void;
}

function ClickHandler({ onAdd }: { onAdd: (p: ZonePoint) => void }) {
  useMapEvents({
    click(e) {
      onAdd({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function ZoneDrawingMap({
  points,
  onPointsChange,
  zoneTypeColor = '#3b82f6',
  isDrawing,
  onDrawingChange,
}: Props) {
  const color = zoneTypeColor;
  const mapRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Undo/Redo stacks
  const undoStackRef = useRef<ZonePoint[][]>([]);
  const redoStackRef = useRef<ZonePoint[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateUndoRedoState = () => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const applyPoints = useCallback((nextPoints: ZonePoint[], record = true) => {
    if (record) {
      undoStackRef.current.push(JSON.parse(JSON.stringify(points)));
      redoStackRef.current = [];
    }
    updateUndoRedoState();
    onPointsChange(nextPoints);
  }, [onPointsChange, points]);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop() as ZonePoint[];
    redoStackRef.current.push(JSON.parse(JSON.stringify(points)));
    updateUndoRedoState();
    onPointsChange(prev);
  }, [onPointsChange, points]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop() as ZonePoint[];
    undoStackRef.current.push(JSON.parse(JSON.stringify(points)));
    updateUndoRedoState();
    onPointsChange(next);
  }, [onPointsChange, points]);

  // keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // clear history on mount
  useEffect(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    updateUndoRedoState();
  }, []);

  /* ================= MOBILE FULLSCREEN ================= */
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-background z-[9999]">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-card border-b">
          <h3 className="text-sm font-medium">Draw Zone (Fullscreen)</h3>
          <Button size="sm" variant="ghost" onClick={() => setIsFullscreen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Map Area */}
        <div className="absolute top-[56px] bottom-0 left-0 right-0">
          <MapContainer
            center={[-2.5583, 121.3616]}
            zoom={17}
            className="w-full h-full"
            whenCreated={(map) => {
              mapRef.current = map;
              setTimeout(() => map.invalidateSize(), 200);
            }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {isDrawing && (
              <ClickHandler
                onAdd={(p) => applyPoints([...points, p], true)}
              />
            )}

            {points.length >= 3 && (
              <Polygon
                positions={points.map(p => [p.lat, p.lng])}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.3,
                }}
              />
            )}

            {points.map((p, i) => (
              <Marker
                key={i}
                position={[p.lat, p.lng]}
                icon={createNumberedIcon(i + 1, color)}
                draggable={true}
                eventHandlers={{
                  dragend: (e: any) => {
                    const latlng = e.target.getLatLng();
                    const next = points.map((pt, idx) => (idx === i ? { lat: latlng.lat, lng: latlng.lng } : pt));
                    applyPoints(next, true);
                  }
                }}
              />
            ))}

            <FitBoundsHelper mapRef={mapRef} points={points} />
          </MapContainer>
        </div>

        {/* Floating Controls */}
        <div className="fixed bottom-6 left-6 flex gap-3 z-[10000]">
          <Button
            size="lg"
            variant={isDrawing ? 'default' : 'secondary'}
            onClick={() => onDrawingChange(!isDrawing)}
            className="rounded-xl shadow-lg"
          >
            <MousePointer2 className="w-5 h-5" />
          </Button>

          {points.length > 0 && (
            <>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => handleUndo()}
                className="rounded-xl shadow-lg"
                disabled={!canUndo}
              >
                <Undo2 className="w-5 h-5" />
              </Button>

              <Button
                size="lg"
                variant="destructive"
                onClick={() => applyPoints([], true)}
                className="rounded-xl shadow-lg"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ================= DESKTOP VERSION (UNCHANGED) ================= */
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border">
      <MapContainer
        center={[-2.5583, 121.3616]}
        zoom={17}
        className="w-full h-full"
        whenCreated={(map) => {
          mapRef.current = map;
          setTimeout(() => map.invalidateSize(), 200);
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {isDrawing && (
          <ClickHandler
            onAdd={(p) => applyPoints([...points, p], true)}
          />
        )}

        {points.length >= 3 && (
          <Polygon
            positions={points.map(p => [p.lat, p.lng])}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.3,
            }}
          />
        )}

        {points.map((p, i) => (
          <Marker
            key={i}
            position={[p.lat, p.lng]}
            icon={createNumberedIcon(i + 1, color)}
            draggable={true}
            eventHandlers={{
              dragend: (e: any) => {
                const latlng = e.target.getLatLng();
                const next = points.map((pt, idx) => (idx === i ? { lat: latlng.lat, lng: latlng.lng } : pt));
                applyPoints(next, true);
              }
            }}
          />
        ))}

        <FitBoundsHelper mapRef={mapRef} points={points} />
      </MapContainer>

      <div className="absolute bottom-4 left-4 lg:top-4 lg:bottom-auto flex gap-2 z-[1000] flex-wrap">
        <Button
          size="sm"
          variant={isDrawing ? 'default' : 'secondary'}
          onClick={() => onDrawingChange(!isDrawing)}
          className="gap-2"
        >
          <MousePointer2 className="w-4 h-4" />
          <span className="hidden lg:inline">
            {isDrawing ? 'Stop Drawing' : 'Draw Zone'}
          </span>
        </Button>

        {points.length > 0 && (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleUndo()}
              disabled={!canUndo}
            >
              <Undo2 className="w-4 h-4" />
              <span className="hidden lg:inline ml-1">Undo</span>
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() => applyPoints([], true)}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden lg:inline ml-1">Clear</span>
            </Button>
          </>
        )}
      </div>

      <Button
        size="sm"
        variant="secondary"
        onClick={() => setIsFullscreen(true)}
        className="absolute bottom-4 right-4 z-[1000] lg:hidden"
      >
        <Maximize2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

function FitBoundsHelper({ mapRef, points }: { mapRef: any; points: ZonePoint[] }) {
  useEffect(() => {
    let mounted = true
    let attempts = 0
    let timer: NodeJS.Timeout | null = null

    const onResize = () => {
      try {
        mapRef.current?.invalidateSize()
      } catch {}
    }

    window.addEventListener('resize', onResize)

    const tryFit = () => {
      if (!mounted) return
      const mm = mapRef.current
      if (!mm) {
        attempts += 1
        if (attempts > 8) return
        timer = setTimeout(tryFit, 200)
        return
      }

      try {
        mm.invalidateSize()

        if (points && points.length === 1) {
          const p = points[0]
          if (typeof mm.whenReady === 'function') {
            mm.whenReady(() => mm.setView([p.lat, p.lng], 17))
          } else {
            mm.setView([p.lat, p.lng], 17)
          }
        } else if (points && points.length > 1) {
          const latlngs = points.map(p => [p.lat, p.lng])
          const bounds = L.latLngBounds(latlngs as any)
          if (typeof mm.whenReady === 'function') {
            mm.whenReady(() => mm.fitBounds(bounds, { padding: [32, 32] }))
          } else {
            mm.fitBounds(bounds, { padding: [32, 32] })
          }
        }
      } catch {
        attempts += 1
        if (attempts <= 8) timer = setTimeout(tryFit, 200)
      }
    }

    // small delay to let map render and tiles load
    timer = setTimeout(tryFit, 120)

    return () => {
      mounted = false
      window.removeEventListener('resize', onResize)
      if (timer) clearTimeout(timer)
    }
  }, [mapRef, points]);

  return null;
}
