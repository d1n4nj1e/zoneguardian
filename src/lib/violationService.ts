import { supabase } from '@/lib/supabase'

export interface RawViolation {
  id: string
  asset_id: string
  assignment_id: string
  lat: number
  lng: number
  status: 'danger'
  acknowledged: boolean
  created_at: string
}

/**
 * =================================
 * VIOLATION SERVICE (FRONTEND)
 * =================================
 * DEPRECATED: Violation creation now happens
 * in violationEngine.ts (database-driven).
 *
 * This file handles:
 * - Load violations from DB
 * - Subscribe to violation updates (realtime)
 * - Acknowledge violations (supervisor only, RLS enforced)
 */

// ==============================
// LOAD UNACKNOWLEDGED VIOLATIONS
// ==============================
export async function loadUnacknowledgedViolations(): Promise<RawViolation[]> {
  console.log('[violationService] Loading unacknowledged violations...')

  try {
    const { data, error } = await supabase
      .from('violations')
      .select('*')
      .eq('acknowledged', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[violationService] Load error:', error.message)
      return []
    }

    console.log('[violationService] Loaded', data?.length ?? 0, 'violations')
    return data ?? []
  } catch (error) {
    console.error('[violationService] Exception loading violations:', error)
    return []
  }
}

// ==============================
// REALTIME SUBSCRIPTION
// ==============================
export function subscribeViolationChanges(
  onInsert: (v: RawViolation) => void,
  onAcknowledge: (id: string) => void
) {
  console.log('[violationService] Setting up realtime subscription')

  const channel = supabase
    .channel('violations-industrial')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'violations' },
      payload => {
        const v = payload.new as RawViolation
        if (!v.acknowledged) {
          console.log('[violationService] New violation inserted:', {
            id: v.id,
            assignmentId: v.assignment_id,
            status: v.status,
          })
          onInsert(v)
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'violations' },
      payload => {
        const v = payload.new as RawViolation
        if (v.acknowledged) {
          console.log('[violationService] Violation acknowledged:', v.id)
          onAcknowledge(v.id)
        }
      }
    )
    .subscribe(status => {
      console.log('[violationService] Channel status:', status)
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        console.warn('[violationService] Channel error')
      }
    })

  return () => {
    console.log('[violationService] Unsubscribe')
    supabase.removeChannel(channel)
  }
}

// ==============================
// ACKNOWLEDGE VIOLATION (supervisor only)
// RLS will enforce role check
// ==============================
export async function acknowledgeViolation(id: string) {
  console.log('[violationService] Acknowledging violation:', id)

  try {
    const { error } = await supabase
      .from('violations')
      .update({ acknowledged: true })
      .eq('id', id)

    if (error) {
      console.error('[violationService] ACK error:', error.message)
      // RLS will return 42501 (permission denied) if not supervisor
      if (error.code === '42501') {
        console.error('[violationService] Permission denied - not a supervisor')
        throw new Error('Only supervisors can acknowledge violations')
      }
      throw error
    }

    console.log('[violationService] ✅ Violation acknowledged:', id)
  } catch (error) {
    console.error('[violationService] Exception acknowledging violation:', error)
    throw error
  }
}

