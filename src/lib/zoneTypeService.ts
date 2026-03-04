import { supabase } from '@/lib/supabase'
import type { ZoneType } from '@/types/zone'

/**
 * =================================
 * ZONE TYPE SERVICE (FINAL)
 * =================================
 * - Optimistic-safe
 * - Realtime incremental updates
 * - No full reload on every change
 * - Proper DELETE handling
 */

// =================================
// LOAD
// =================================
export async function loadZoneTypes(): Promise<ZoneType[]> {
  try {
    const { data, error } = await supabase
      .from('zone_types')
      .select('id, name, color, created_at, updated_at')
      .order('name', { ascending: true })

    if (error) {
      console.error('[zoneTypeService] Load error:', error.message)
      return []
    }

    return data ?? []
  } catch (err) {
    console.error('[zoneTypeService] Exception loading zone types:', err)
    return []
  }
}

// =================================
// CREATE
// =================================
export async function createZoneType(
  name: string,
  color: string
): Promise<ZoneType | null> {
  try {
    if (!name.trim()) return null
    if (!/^#[0-9A-F]{6}$/i.test(color)) return null

    const { data, error } = await supabase
      .from('zone_types')
      .insert({
        name: name.trim(),
        color: color.toUpperCase(),
      })
      .select('id, name, color, created_at, updated_at')
      .single()

    if (error) {
      console.error('[zoneTypeService] Create error:', error.message)
      return null
    }

    return data
  } catch (err) {
    console.error('[zoneTypeService] Exception creating zone type:', err)
    return null
  }
}

// =================================
// UPDATE
// =================================
export async function updateZoneType(
  id: string,
  name?: string,
  color?: string
): Promise<ZoneType | null> {
  try {
    const updates: any = {}

    if (name) updates.name = name.trim()
    if (color) updates.color = color.toUpperCase()

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('zone_types')
      .update(updates)
      .eq('id', id)
      .select('id, name, color, created_at, updated_at')
      .single()

    if (error) {
      console.error('[zoneTypeService] Update error:', error.message)
      return null
    }

    return data
  } catch (err) {
    console.error('[zoneTypeService] Exception updating zone type:', err)
    return null
  }
}

// =================================
// DELETE
// =================================
export async function deleteZoneType(id: string): Promise<boolean> {
  try {
    // check usage
    const { count, error: countError } = await supabase
      .from('zones')
      .select('id', { count: 'exact', head: true })
      .eq('zone_type_id', id)

    if (countError) return false
    if (count && count > 0) return false

    const { error } = await supabase
      .from('zone_types')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[zoneTypeService] Delete error:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('[zoneTypeService] Exception deleting zone type:', err)
    return false
  }
}

// =================================
// REALTIME (INCREMENTAL)
// =================================
export function subscribeZoneTypeChanges(
  setZoneTypes: React.Dispatch<React.SetStateAction<ZoneType[]>>
) {
  const channel = supabase
    .channel('zone-types-realtime')

    // INSERT
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'zone_types' },
      payload => {
        setZoneTypes(prev => {
          const exists = prev.find(z => z.id === payload.new.id)
          if (exists) return prev
          return [...prev, payload.new as ZoneType]
        })
      }
    )

    // UPDATE
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'zone_types' },
      payload => {
        setZoneTypes(prev =>
          prev.map(z =>
            z.id === payload.new.id ? (payload.new as ZoneType) : z
          )
        )
      }
    )

    // DELETE
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'zone_types' },
      payload => {
        setZoneTypes(prev =>
          prev.filter(z => z.id !== payload.old.id)
        )
      }
    )

    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
