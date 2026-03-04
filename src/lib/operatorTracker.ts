/**
 * DEPRECATED: This module is no longer used.
 *
 * Tracking is now handled by services:
 * - trackingService.ts (global GPS tracking)
 * - violationEngine.ts (database-driven violation detection)
 * - alarmService.ts (global alarm management)
 *
 * This file is kept for reference / backward compatibility only.
 */

import { getGeofenceStatus } from '@/lib/geofence'
import { checkAndRecordViolation } from '@/services/violationEngine'

/**
 * @deprecated - Use violationEngine.checkAndRecordViolation instead
 */
export async function trackPosition(
  position: [number, number],
  zone: [number, number][],
  assetId: string,
  assignmentId: string
) {
  console.warn(
    '[operatorTracker] DEPRECATED: Use violationEngine.checkAndRecordViolation'
  )

  // Delegate to new system
  return checkAndRecordViolation(assignmentId, assetId, position, zone)
}

