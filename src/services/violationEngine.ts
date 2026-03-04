/**
 * =================================
 * VIOLATION ENGINE (DATABASE-DRIVEN)
 * =================================
 * Core safety logic that detects boundary crossings & elevation violations.
 * 
 * CRITICAL: This is NOT memory-based.
 * It reads from database to ensure determinism
 * and survival across device reloads/backgrounding.
 *
 * Violation triggers when:
 *   previous_status !== 'danger'
 *   AND
 *   current_status === 'danger'
 *
 * current_status === 'danger' if:
 *   - Asset outside polygon, OR
 *   - Elevation outside min-max range (if elevation_enabled)
 *
 * Pattern: Read from DB → compute → decide → update
 */

import { supabase } from '@/lib/supabase'
import { getGeofenceStatus, getGeofenceStatusWithElevation } from '@/lib/geofence'
import type { GeofenceStatus } from '@/lib/geofence'
import { log } from '@/services/logger'

export interface ViolationCheckResult {
  triggered: boolean
  previousStatus: GeofenceStatus
  currentStatus: GeofenceStatus
  assignmentId: string
}

/**
 * CHECK FOR VIOLATION AND PERSIST
 * Called every time position updates.
 *
 * Industrial pattern:
 * 1. Read last_status from zone_assignments
 * 2. Compute current_status via geofence logic (including elevation if enabled)
 * 3. Detect crossing: previous !== 'danger' AND current === 'danger'
 * 4. INSERT violation if triggered
 * 5. UPDATE zone_assignments.last_status always
 */
export async function checkAndRecordViolation(
  assignmentId: string,
  assetId: string,
  position: [number, number], // [lat, lng]
  zone: [number, number][], // polygon [[lat, lng], ...]
  elevation?: number | null, // optional: elevation in meters
  elevationEnabled: boolean = false, // is elevation checking enabled for this zone
  minElevation?: number | null, // minimum allowed elevation
  maxElevation?: number | null  // maximum allowed elevation
): Promise<ViolationCheckResult> {
  const result: ViolationCheckResult = {
    triggered: false,
    previousStatus: 'safe',
    currentStatus: 'safe',
    assignmentId,
  }

  try {
    // ================================
    // 1️⃣ READ last_status from DB
    // ================================
    const { data: assignment, error: readError } = await supabase
      .from('zone_assignments')
      .select('last_status')
      .eq('id', assignmentId)
      .single()

    if (readError) {
      log('error', 'violationEngine', 'Failed to read assignment', { message: readError.message })
      return result
    }

    const previousStatus = (assignment?.last_status ?? 'safe') as GeofenceStatus
    result.previousStatus = previousStatus

    // ================================
    // 2️⃣ COMPUTE current status
    // ================================
    let currentStatus: GeofenceStatus

    if (elevationEnabled) {
      // Use elevation-aware geofence check
      currentStatus = getGeofenceStatusWithElevation(
        position,
        zone,
        elevation,
        elevationEnabled,
        minElevation,
        maxElevation
      )
    } else {
      // Use standard 2D geofence check
      currentStatus = getGeofenceStatus(position, zone)
    }

    result.currentStatus = currentStatus

    log('debug', 'violationEngine', 'Status check', {
      assignmentId,
      previousStatus,
      currentStatus,
      position,
      elevation,
      elevationEnabled,
    })

    // ================================
    // 3️⃣ DETECT CROSSING
    // ================================
    const isCrossing =
      previousStatus !== 'danger' && currentStatus === 'danger'

    if (isCrossing) {
      log('warn', 'violationEngine', 'VIOLATION TRIGGERED', {
        assignmentId,
        assetId,
        previousStatus,
        currentStatus,
        elevation,
      })

      result.triggered = true

      // ================================
      // 4️⃣ INSERT VIOLATION
      // ================================
      const { error: insertError } = await supabase
        .from('violations')
        .insert({
          assignment_id: assignmentId,
          asset_id: assetId,
          lat: position[0],
          lng: position[1],
          status: 'danger',
          acknowledged: false,
        })

      if (insertError) {
        // UNIQUE constraint might block it - that's OK
        if (insertError.code === '23505') {
          log('info', 'violationEngine', 'Duplicate violation (constraints in effect)')
        } else {
          log('error', 'violationEngine', 'Insert violation error', { message: insertError.message })
          throw insertError
        }
      }
    }

    // ================================
    // 5️⃣ UPDATE last_status ALWAYS
    // ================================
    const { error: updateError } = await supabase
      .from('zone_assignments')
      .update({ last_status: currentStatus })
      .eq('id', assignmentId)

    if (updateError) {
      log('error', 'violationEngine', 'Failed to update last_status', { message: updateError.message })
      throw updateError
    }

    log('info', 'violationEngine', 'last_status updated', {
      assignmentId,
      previousStatus,
      newStatus: currentStatus,
    })

    return result
  } catch (error) {
    console.error('[violationEngine] Fatal error:', error)
    throw error
  }
}

/**
 * BATCH CHECK VIOLATIONS WITH ELEVATION SUPPORT
 * For cases where you want to check multiple assignments
 */
export async function checkMultipleViolations(
  positions: Array<{
    assignmentId: string
    assetId: string
    position: [number, number]
    zone: [number, number][]
    elevation?: number | null
    elevationEnabled?: boolean
    minElevation?: number | null
    maxElevation?: number | null
  }>
): Promise<ViolationCheckResult[]> {
  const results = await Promise.all(
    positions.map(
      ({
        assignmentId,
        assetId,
        position,
        zone,
        elevation,
        elevationEnabled,
        minElevation,
        maxElevation,
      }) =>
        checkAndRecordViolation(
          assignmentId,
          assetId,
          position,
          zone,
          elevation,
          elevationEnabled ?? false,
          minElevation,
          maxElevation
        ).catch(err => {
          console.error('[violationEngine] Batch check error for', assignmentId, err)
          return {
            triggered: false,
            previousStatus: 'safe' as const,
            currentStatus: 'safe' as const,
            assignmentId,
          }
        })
    )
  )

  return results
}
