import * as turf from '@turf/turf';

export type GeofenceStatus = 'safe' | 'warning' | 'danger';

// 🔥 ANGKA REAL-WORLD (recommended tambang / fleet tracking)
const WARNING_DISTANCE = 10; // meter
// boleh 50–100 tergantung seberapa early warning yang diinginkan

/**
 * position: [lat, lng]
 * zone: [lat, lng][]
 */
export function getGeofenceStatus(
  position: [number, number],
  zone: [number, number][]
): GeofenceStatus {
  const point = turf.point([position[1], position[0]]);

  const polygon = turf.polygon([
    [
      ...zone.map(([lat, lng]) => [lng, lat]),
      [zone[0][1], zone[0][0]],
    ],
  ]);

  const isInside = turf.booleanPointInPolygon(point, polygon);
  if (!isInside) return 'danger';

  const boundary = turf.polygonToLine(polygon);

  const distance = turf.pointToLineDistance(point, boundary, {
    units: 'meters',
  });

  // ✅ WARNING ZONE REALISTIC
  if (distance <= WARNING_DISTANCE) return 'warning';

  return 'safe';
}

/**
 * Extended geofence status check with elevation support
 * Returns danger if:
 * - Not in polygon, OR
 * - Elevation is outside min-max range (if enabled)
 */
export function getGeofenceStatusWithElevation(
  position: [number, number], // [lat, lng]
  zone: [number, number][],   // polygon [[lat, lng], ...]
  elevation?: number | null,  // meters above sea level
  elevationEnabled: boolean = false,
  minElevation?: number | null,
  maxElevation?: number | null
): GeofenceStatus {
  // First check 2D polygon boundary
  const point = turf.point([position[1], position[0]]);

  const polygon = turf.polygon([
    [
      ...zone.map(([lat, lng]) => [lng, lat]),
      [zone[0][1], zone[0][0]],
    ],
  ]);

  const isInPolygon = turf.booleanPointInPolygon(point, polygon);
  if (!isInPolygon) return 'danger';

  // Check elevation if enabled
  if (elevationEnabled && elevation != null && minElevation != null && maxElevation != null) {
    if (elevation < minElevation || elevation > maxElevation) {
      return 'danger';
    }
  }

  // Check distance to boundary warning zone
  const boundary = turf.polygonToLine(polygon);

  const distance = turf.pointToLineDistance(point, boundary, {
    units: 'meters',
  });

  if (distance <= WARNING_DISTANCE) return 'warning';

  return 'safe';
}
