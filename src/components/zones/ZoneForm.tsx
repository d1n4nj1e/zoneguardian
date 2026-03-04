import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ZoneType, ZonePoint, Zone } from '@/types/zone'
import ZoneDrawingMap from './ZoneDrawingMap'
import { ArrowLeft, Save, MapPin, Loader, Plus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { loadZoneTypes } from '@/lib/zoneTypeService'
import { createZone, updateZone } from '@/lib/zoneService'
import { parseUtmCoordinates, validateUtmZone } from '@/lib/utm'
import { parseKmlFile } from '@/lib/kml'

interface ZoneFormProps {
  onCancel: () => void
  zone?: Zone | null
  onSaved?: (zone: Zone) => void
}

const ZoneForm = ({ onCancel, zone, onSaved }: ZoneFormProps) => {
  const [name, setName] = useState('')
  const [zone_type_id, setZoneTypeId] = useState<string>('')
  const [isActive, setIsActive] = useState(true)
  const [points, setPoints] = useState<ZonePoint[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [coordinateText, setCoordinateText] = useState('')
  const [coordinateMode, setCoordinateMode] = useState<'latlng' | 'utm'>('latlng')
  const [utmZone, setUtmZone] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [zoneTypes, setZoneTypes] = useState<ZoneType[]>([])
  const [elevationEnabled, setElevationEnabled] = useState(false)
  const [minElevation, setMinElevation] = useState<string>('')
  const [maxElevation, setMaxElevation] = useState<string>('')
  const navigate = useNavigate()

  // Load zone types on mount
  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const types = await loadZoneTypes()
        setZoneTypes(types)
        // Set first zone type as default
        if (types.length > 0) {
          // prefer existing zone type when editing
          setZoneTypeId(zone?.zone_type_id ?? types[0].id)
        }
      } catch (err) {
        console.error('Error loading zone types:', err)
        setErrors(prev => ({
          ...prev,
          zoneTypes: 'Failed to load zone types',
        }))
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Initialize form when editing an existing zone
  useEffect(() => {
    if (!zone) return
    setName(zone.name ?? '')
    setZoneTypeId(zone.zone_type_id ?? '')
    setIsActive(zone.status === 'active')
    setElevationEnabled(zone.elevation_enabled ?? false)
    if (zone.min_elevation != null) setMinElevation(zone.min_elevation.toString())
    if (zone.max_elevation != null) setMaxElevation(zone.max_elevation.toString())

    try {
      const coords = zone.polygon?.coordinates?.[0] ?? []
      // Convert [[lng, lat], ...] -> [{lat, lng}, ...]
      const pts = coords
        .map((c: any) => ({ lat: c[1], lng: c[0] }))
        // drop closing coordinate if equal to first
        .filter((p: any, i: number, arr: any[]) => {
          if (i === arr.length - 1 && arr.length > 1) {
            return !(p.lat === arr[0].lat && p.lng === arr[0].lng)
          }
          return true
        })
      setPoints(pts)
    } catch (e) {
      // ignore malformed polygon
    }
  }, [zone])

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Zone name is required'
    if (points.length < 3) e.points = 'At least 3 points are required'
    if (!zone_type_id) e.zoneType = 'Zone type is required'

    // Validate elevation fields
    if (elevationEnabled) {
      const minVal = minElevation.trim() ? parseFloat(minElevation) : null
      const maxVal = maxElevation.trim() ? parseFloat(maxElevation) : null

      if (minVal === null) {
        e.minElevation = 'Minimum elevation is required'
      } else if (Number.isNaN(minVal)) {
        e.minElevation = 'Minimum elevation must be a number'
      }

      if (maxVal === null) {
        e.maxElevation = 'Maximum elevation is required'
      } else if (Number.isNaN(maxVal)) {
        e.maxElevation = 'Maximum elevation must be a number'
      }

      if (minVal !== null && maxVal !== null && !Number.isNaN(minVal) && !Number.isNaN(maxVal)) {
        if (minVal >= maxVal) {
          e.elevation = 'Minimum elevation must be less than maximum elevation'
        }
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setSaving(true)

    try {
      // Close polygon (first point = last point)
      const ring = points.map(p => [p.lng, p.lat])
      if (
        ring.length > 0 &&
        (ring[0][0] !== ring[ring.length - 1][0] ||
          ring[0][1] !== ring[ring.length - 1][1])
      ) {
        ring.push(ring[0])
      }

      const polygon = {
        type: 'Polygon',
        coordinates: [ring],
      }

      const zoneData = {
        name,
        zone_type_id,
        polygon,
        status: isActive ? 'active' : 'inactive' as const,
        elevation_enabled: elevationEnabled,
        min_elevation: elevationEnabled && minElevation.trim() ? parseFloat(minElevation) : null,
        max_elevation: elevationEnabled && maxElevation.trim() ? parseFloat(maxElevation) : null,
      }

      if (zone) {
        const updated = await updateZone(zone.id, zoneData)

        if (!updated) {
          alert('Failed to update zone. Please try again.')
          return
        }

        toast.success('Zone updated successfully')
        onSaved?.(updated)
      } else {
        const result = await createZone(
          name,
          zone_type_id,
          polygon,
          isActive ? 'active' : 'inactive',
          {
            elevation_enabled: elevationEnabled,
            min_elevation: elevationEnabled && minElevation.trim() ? parseFloat(minElevation) : null,
            max_elevation: elevationEnabled && maxElevation.trim() ? parseFloat(maxElevation) : null,
          }
        )

        if (!result) {
          alert('Failed to create zone. Please try again.')
          return
        }

        toast.success('Zone created successfully')
        onSaved?.(result)
      }
    } catch (err) {
      console.error('Error saving zone:', err)
      alert('Unexpected error while saving zone')
    } finally {
      setSaving(false)
    }
  }

  function parseCoordinates(text: string) {
    if (!text) return []
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const out: ZonePoint[] = []
    for (const line of lines) {
      // allow comma or space separators
      const parts = line.split(/[,\s]+/).map(p => p.trim())
      if (parts.length < 2) continue
      const a = parseFloat(parts[0])
      const b = parseFloat(parts[1])
      if (Number.isNaN(a) || Number.isNaN(b)) continue
      // determine if format is lat,lng (lat should be between -90 and 90)
      if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
        out.push({ lat: a, lng: b })
      } else if (Math.abs(b) <= 90 && Math.abs(a) <= 180) {
        // maybe lng,lat -> swap
        out.push({ lat: b, lng: a })
      } else {
        // fallback: treat as lat,lng
        out.push({ lat: a, lng: b })
      }
    }
    return out
  }

  const handleImportCoordinates = () => {
    if (coordinateMode === 'utm') {
      // UTM mode
      if (!utmZone.trim()) {
        toast.error('Please enter UTM Zone (e.g., 51S)')
        return
      }

      const validation = validateUtmZone(utmZone)
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid UTM Zone')
        return
      }

      const pts = parseUtmCoordinates(coordinateText, utmZone)
      if (pts.length === 0) {
        toast.error('No valid UTM coordinates parsed. Format: easting northing per line')
        return
      }

      setPoints(pts)
      toast.success(`Imported ${pts.length} points from UTM`)
    } else {
      // Lat/Lng mode
      const pts = parseCoordinates(coordinateText)
      if (pts.length === 0) {
        toast.error('No valid coordinates parsed')
        return
      }
      setPoints(pts)
      toast.success(`Imported ${pts.length} points`)
    }
  }

  const handleKmlUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const result = await parseKmlFile(file)

      if (!result.success) {
        toast.error(result.error || 'Failed to parse KML file')
        return
      }

      if (!result.coordinates || result.coordinates.length < 3) {
        toast.error('KML must contain a valid polygon with at least 3 points')
        return
      }

      setPoints(result.coordinates)
      toast.success(`Imported ${result.coordinates.length} points from KML/KMZ`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`KML parsing error: ${message}`)
    } finally {
      // Reset file input
      event.target.value = ''
    }
  }

  const selectedZoneType = zoneTypes.find(zt => zt.id === zone_type_id)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading zone types...</p>
        </div>
      </div>
    )
  }

  const title = zone ? 'Edit Zone' : 'Create New Zone'
  const saveLabel = zone ? 'Save Changes' : 'Save Zone'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground">
              Define zone boundaries on the map
            </p>
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={saving || points.length < 3 || !name.trim() || !zone_type_id}
          className="gap-2 flex-shrink-0"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : saveLabel}
        </Button>
      </div>

      {/* Main layout: flex column on mobile, row on desktop */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 min-h-0">
        {/* Left sidebar: form controls, scrollable */}
        <div className="w-full lg:w-80 lg:min-w-80 lg:border-r border-border/50 p-6 flex flex-col gap-6 overflow-y-auto bg-card/20 lg:order-1">
          <div className="space-y-2">
            <Label>Zone Name *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Main Pit Area"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Zone Type *</Label>
              <Button variant="ghost" size="sm" onClick={() => navigate('/zone-types')}>
                <Plus className="w-3 h-3 mr-2" />
                Manage types
              </Button>
            </div>
            {zoneTypes.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  No zone types available. Create one in Zone Type Management.
                </p>
              </div>
            ) : (
              <Select value={zone_type_id} onValueChange={setZoneTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a zone type" />
                </SelectTrigger>
                <SelectContent>
                  {zoneTypes.map(zt => (
                    <SelectItem key={zt.id} value={zt.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: zt.color }}
                        />
                        {zt.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.zoneType && (
              <p className="text-xs text-destructive">{errors.zoneType}</p>
            )}
            {errors.zoneTypes && (
              <p className="text-xs text-destructive">{errors.zoneTypes}</p>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-background/30 rounded-lg border">
            <div>
              <Label>Status</Label>
              <p className="text-xs text-muted-foreground">
                {isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-3 p-4 bg-background/30 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Elevation Limit (3D Geofence)</Label>
                <p className="text-xs text-muted-foreground">
                  {elevationEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <Switch checked={elevationEnabled} onCheckedChange={setElevationEnabled} />
            </div>

            {elevationEnabled && (
              <div className="space-y-2 border-t pt-3">
                <div>
                  <Label className="text-xs">Min Elevation (meters) *</Label>
                  <Input
                    type="number"
                    value={minElevation}
                    onChange={(e) => setMinElevation(e.target.value)}
                    placeholder="e.g., 100"
                    className={`h-8 text-xs mt-1 ${errors.minElevation ? 'border-destructive' : ''}`}
                  />
                  {errors.minElevation && (
                    <p className="text-xs text-destructive mt-1">{errors.minElevation}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs">Max Elevation (meters) *</Label>
                  <Input
                    type="number"
                    value={maxElevation}
                    onChange={(e) => setMaxElevation(e.target.value)}
                    placeholder="e.g., 500"
                    className={`h-8 text-xs mt-1 ${errors.maxElevation ? 'border-destructive' : ''}`}
                  />
                  {errors.maxElevation && (
                    <p className="text-xs text-destructive mt-1">{errors.maxElevation}</p>
                  )}
                </div>

                {errors.elevation && (
                  <p className="text-xs text-destructive">{errors.elevation}</p>
                )}
              </div>
            )}
          </div>

          <div className="p-4 bg-background/30 rounded-lg border">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Preview
            </h4>
            <div className="text-sm space-y-1">
              <div>Name: {name || '—'}</div>
              <div>
                Type: {selectedZoneType ? selectedZoneType.name : '—'}
              </div>
              <div>Points: {points.length}</div>
              <div>Status: {isActive ? 'Active' : 'Inactive'}</div>
            </div>
          </div>

          <div className="p-4 bg-background/30 rounded-lg border">
            <h4 className="text-sm font-medium mb-3">Import Data</h4>

            <Tabs value={coordinateMode} onValueChange={(v) => setCoordinateMode(v as 'latlng' | 'utm')} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-3 h-8">
                <TabsTrigger value="latlng" className="text-xs">Lat/Lng</TabsTrigger>
                <TabsTrigger value="utm" className="text-xs">UTM</TabsTrigger>
                <TabsTrigger value="kml" className="text-xs">KML/KMZ</TabsTrigger>
              </TabsList>

              <TabsContent value="latlng" className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Paste coordinates one per line in <strong>lat,lng</strong> format. Example: <span className="font-mono">-2.5583,121.3616</span>
                </p>
                <textarea
                  value={coordinateText}
                  onChange={(e) => setCoordinateText(e.target.value)}
                  className="w-full h-24 p-2 rounded-md bg-background border border-border text-xs"
                  placeholder={`-2.5583,121.3616\n-2.5585,121.3620`}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleImportCoordinates}>
                    Import
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setCoordinateText('')}>Clear</Button>
                </div>
              </TabsContent>

              <TabsContent value="utm" className="space-y-2">
                <div>
                  <Label className="text-xs">UTM Zone *</Label>
                  <Input
                    value={utmZone}
                    onChange={(e) => setUtmZone(e.target.value.toUpperCase())}
                    placeholder="e.g., 51S, 48N"
                    className="h-8 text-xs mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: 2 digits + letter (C-X, excluding I, O, B, Y)
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Coordinates</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Format: <strong>easting northing</strong> per line
                  </p>
                  <textarea
                    value={coordinateText}
                    onChange={(e) => setCoordinateText(e.target.value)}
                    className="w-full h-24 p-2 rounded-md bg-background border border-border text-xs"
                    placeholder={`562430 9737127\n564800 9738945`}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleImportCoordinates}>
                    Import UTM
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setCoordinateText(''); setUtmZone('') }}>Clear</Button>
                </div>
              </TabsContent>

              <TabsContent value="kml" className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Upload KML or KMZ file. Only Polygon geometries are supported.
                </p>
                <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition">
                  <input
                    type="file"
                    accept=".kml,.kmz"
                    onChange={handleKmlUpload}
                    className="hidden"
                    id="kml-input"
                  />
                  <label htmlFor="kml-input" className="cursor-pointer block">
                    <Upload className="w-4 h-4 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs font-medium">Click to upload or drag & drop</p>
                    <p className="text-xs text-muted-foreground">KML or KMZ files</p>
                  </label>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {errors.points && (
            <p className="text-sm text-destructive">{errors.points}</p>
          )}
        </div>

        {/* Right side: map, always visible on all screen sizes */}
        <div className="w-full lg:flex-1 h-64 lg:h-auto min-h-64 lg:min-h-0">
          <ZoneDrawingMap
            points={points}
            onPointsChange={setPoints}
            zoneTypeColor={selectedZoneType?.color}
            isDrawing={isDrawing}
            onDrawingChange={setIsDrawing}
          />
        </div>
      </div>
    </div>
  )
}

export default ZoneForm
