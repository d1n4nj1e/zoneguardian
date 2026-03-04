import { supabase } from '@/lib/supabase'
import type { Zone, ZoneType } from '@/types/zone'

/**
 * Load all active zones with zone type details
 * Joins zones with zone_types table for complete data
 */
export async function loadActiveZones(): Promise<Zone[]> {
  console.log('[zoneService] Loading active zones with type details...')

  try {
    const { data, error } = await supabase
      .from('zones')
      .select(`
        id,
        name,
        zone_type_id,
        polygon,
        status,
        elevation_enabled,
        min_elevation,
        max_elevation,
        created_at,
        updated_at,
        zone_types!inner (
          id,
          name,
          color,
          created_at,
          updated_at
        )
      `)
      .eq('status', 'active')

    if (error) {
      console.error('[zoneService] Load error:', error.message)
      return []
    }

    // Parse response and map zone_types to zone_type
    const zones = (data ?? []).map(z => {
      const zone: any = { ...z }
      if (z.zone_types) {
        zone.zone_type = z.zone_types[0] || z.zone_types
      }
      delete zone.zone_types
      return zone as Zone
    })

    console.log('[zoneService] Loaded', zones.length, 'zones')
    return zones
  } catch (err) {
    console.error('[zoneService] Exception loading zones:', err)
    return []
  }
}

/**
 * Load all zones (including inactive)
 */
export async function loadAllZones(): Promise<Zone[]> {
  console.log('[zoneService] Loading all zones...')

  try {
    const { data, error } = await supabase
      .from('zones')
      .select(`
        id,
        name,
        zone_type_id,
        polygon,
        status,
        created_at,
        updated_at,
        zone_types!inner (
          id,
          name,
          color,
          created_at,
          updated_at
        )
      `)

    if (error) {
      console.error('[zoneService] Load error:', error.message)
      return []
    }

    const zones = (data ?? []).map(z => {
      const zone: any = { ...z }
      if (z.zone_types) {
        zone.zone_type = z.zone_types[0] || z.zone_types
      }
      delete zone.zone_types
      return zone as Zone
    })

    console.log('[zoneService] Loaded', zones.length, 'zones (all)')
    return zones
  } catch (err) {
    console.error('[zoneService] Exception loading zones:', err)
    return []
  }
}

/**
 * Get single zone by ID with type details
 */
export async function getZoneById(id: string): Promise<Zone | null> {
  try {
    const { data, error } = await supabase
      .from('zones')
      .select(`
        id,
        name,
        zone_type_id,
        polygon,
        status,
        created_at,
        updated_at,
        zone_types!inner (
          id,
          name,
          color,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('[zoneService] Get error:', error.message)
      return null
    }

    if (!data) return null

    const zone: any = { ...data }
    if (data.zone_types) {
      zone.zone_type = data.zone_types[0] || data.zone_types
    }
    delete zone.zone_types

    return zone as Zone
  } catch (err) {
    console.error('[zoneService] Exception getting zone:', err)
    return null
  }
}

/**
 * Create new zone with zone_type_id
 */
export async function createZone(
  name: string,
  zone_type_id: string,
  polygon: any,
  status: 'active' | 'inactive' = 'active',
  elevationData?: {
    elevation_enabled?: boolean
    min_elevation?: number | null
    max_elevation?: number | null
  }
): Promise<Zone | null> {
  console.log('[zoneService] Creating zone:', name)

  try {
    const { data, error } = await supabase
      .from('zones')
      .insert({
        name: name.trim(),
        zone_type_id,
        polygon,
        status,
        elevation_enabled: elevationData?.elevation_enabled ?? false,
        min_elevation: elevationData?.min_elevation ?? null,
        max_elevation: elevationData?.max_elevation ?? null,
      })
      .select(`
        id,
        name,
        zone_type_id,
        polygon,
        status,
        elevation_enabled,
        min_elevation,
        max_elevation,
        created_at,
        updated_at,
        zone_types!inner (
          id,
          name,
          color,
          created_at,
          updated_at
        )
      `)
      .single()

    if (error) {
      console.error('[zoneService] Create error:', error.message)
      return null
    }

    if (!data) return null

    const zone: any = { ...data }
    if (data.zone_types) {
      zone.zone_type = data.zone_types[0] || data.zone_types
    }
    delete zone.zone_types

    console.log('[zoneService] Zone created:', zone.id)
    return zone as Zone
  } catch (err) {
    console.error('[zoneService] Exception creating zone:', err)
    return null
  }
}

/**
 * Update zone
 */
export async function updateZone(
  id: string,
  updates: Partial<{
    name: string
    zone_type_id: string
    polygon: any
    status: 'active' | 'inactive'
    elevation_enabled: boolean
    min_elevation: number | null
    max_elevation: number | null
  }>
): Promise<Zone | null> {
  console.log('[zoneService] Updating zone:', id)

  try {
    const { data, error } = await supabase
      .from('zones')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        name,
        zone_type_id,
        polygon,
        status,
        elevation_enabled,
        min_elevation,
        max_elevation,
        created_at,
        updated_at,
        zone_types!inner (
          id,
          name,
          color,
          created_at,
          updated_at
        )
      `)
      .single()

    if (error) {
      console.error('[zoneService] Update error:', error.message)
      return null
    }

    if (!data) return null

    const zone: any = { ...data }
    if (data.zone_types) {
      zone.zone_type = data.zone_types[0] || data.zone_types
    }
    delete zone.zone_types

    console.log('[zoneService] Zone updated:', id)
    return zone as Zone
  } catch (err) {
    console.error('[zoneService] Exception updating zone:', err)
    return null
  }
}

/**
 * Delete zone
 */
export async function deleteZone(id: string): Promise<boolean> {
  console.log('[zoneService] Deleting zone:', id)

  try {
    const { error } = await supabase
      .from('zones')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[zoneService] Delete error:', error.message)
      return false
    }

    console.log('[zoneService] Zone deleted:', id)
    return true
  } catch (err) {
    console.error('[zoneService] Exception deleting zone:', err)
    return false
  }
}

/**
 * Subscribe to zone changes (realtime)
 */
export function subscribeZoneChanges(
  onUpdate: (zones: Zone[]) => void
): () => void {
  console.log('[zoneService] Setting up realtime subscription')

  // Start with current data
  loadActiveZones().then(onUpdate)

  const channel = supabase
    .channel('zones-monitor')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'zones' },
      payload => {
        const zone = payload.new as any
        if (zone.status === 'active') {
          console.log('[zoneService] Zone inserted:', zone.id)
          loadActiveZones().then(onUpdate)
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'zones' },
      payload => {
        const zone = payload.new as any
        console.log('[zoneService] Zone updated:', zone.id)
        loadActiveZones().then(onUpdate)
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'zones' },
      payload => {
        const zone = payload.old as any
        console.log('[zoneService] Zone deleted:', zone.id)
        loadActiveZones().then(onUpdate)
      }
    )
    .subscribe(status => {
      console.log('[zoneService] Channel status:', status)
    })

  return () => {
    console.log('[zoneService] Unsubscribe')
    supabase.removeChannel(channel)
  }
}

