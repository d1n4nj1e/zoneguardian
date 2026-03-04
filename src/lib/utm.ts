/**
 * UTM <-> WGS84 Conversion Utilities
 * Allows users to import coordinates in UTM format and convert to lat/lng
 */

import proj4 from 'proj4';

/**
 * Initialize proj4 with standard projections
 */
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

export interface UtmCoordinates {
  zone: string;
  easting: number;
  northing: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Validate UTM Zone format (e.g., "51S", "48N")
 * Returns { valid: boolean, error?: string }
 */
export function validateUtmZone(zone: string): { valid: boolean; error?: string } {
  const zoneRegex = /^([0-9]{1,2})([CDEFGHJKLMNPQRSTUVWX])$/i;
  const match = zone.trim().toUpperCase().match(zoneRegex);

  if (!match) {
    return {
      valid: false,
      error: 'Invalid UTM zone format. Expected: 2 digits + 1 letter (e.g., 51S, 48N)',
    };
  }

  const zoneNum = parseInt(match[1], 10);
  if (zoneNum < 1 || zoneNum > 60) {
    return {
      valid: false,
      error: 'UTM zone number must be between 1 and 60',
    };
  }

  const latBand = match[2];
  if (latBand === 'B' || latBand === 'O' || latBand === 'I' || latBand === 'Y') {
    return {
      valid: false,
      error: 'Invalid latitude band: B, I, O, Y are not used',
    };
  }

  return { valid: true };
}

/**
 * Convert UTM to WGS84 (lat, lng)
 */
export function utmToLatLng(utm: UtmCoordinates): LatLng | null {
  try {
    const validation = validateUtmZone(utm.zone);
    if (!validation.valid) {
      console.error(validation.error);
      return null;
    }

    const zone = utm.zone.trim().toUpperCase();
    const zoneNum = parseInt(zone.substring(0, zone.length - 1), 10);
    const latBand = zone[zone.length - 1];

    // Build EPSG code based on hemisphere
    // UTM North vs South based on latitude band
    const isNorthernHemisphere = 'CDEFGHJKLMNPQRSTUVWX'.indexOf(latBand) > 8;
    const epsgCode = isNorthernHemisphere
      ? `EPSG:${32600 + zoneNum}`  // Northern hemisphere: 32601-32660
      : `EPSG:${32700 + zoneNum}`; // Southern hemisphere: 32701-32760

    // Define UTM projection
    proj4.defs(epsgCode,
      `+proj=utm +zone=${zoneNum} ${isNorthernHemisphere ? '' : '+south'} +datum=WGS84 +units=m +no_defs`
    );

    // Convert from UTM to WGS84
    const result = proj4(epsgCode, 'EPSG:4326', [utm.easting, utm.northing]);

    return {
      lng: result[0],
      lat: result[1],
    };
  } catch (error) {
    console.error('Error converting UTM to LatLng:', error);
    return null;
  }
}

/**
 * Convert WGS84 (lat, lng) to UTM
 */
export function latLngToUtm(lat: number, lng: number, zoneNum?: number): UtmCoordinates | null {
  try {
    // Determine zone number if not provided
    let zone = zoneNum;
    if (zone === undefined) {
      zone = Math.floor((lng + 180) / 6) + 1;
    }

    if (zone < 1 || zone > 60) {
      console.error('Invalid UTM zone number');
      return null;
    }

    const isNorthern = lat >= 0;
    const latBand = getUtmLatBand(lat);

    const epsgCode = isNorthern
      ? `EPSG:${32600 + zone}`
      : `EPSG:${32700 + zone}`;

    proj4.defs(epsgCode,
      `+proj=utm +zone=${zone} ${isNorthern ? '' : '+south'} +datum=WGS84 +units=m +no_defs`
    );

    const result = proj4('EPSG:4326', epsgCode, [lng, lat]);

    return {
      zone: `${zone}${latBand}`,
      easting: Math.round(result[0]),
      northing: Math.round(result[1]),
    };
  } catch (error) {
    console.error('Error converting LatLng to UTM:', error);
    return null;
  }
}

/**
 * Get UTM latitude band letter from latitude value
 */
function getUtmLatBand(lat: number): string {
  const bands = 'CDEFGHJKLMNPQRSTUVWX';
  const bandHeight = 8;
  let bandIndex = Math.floor((lat + 80) / bandHeight);

  // Clamp to valid range
  bandIndex = Math.max(0, Math.min(bandIndex, bands.length - 1));

  return bands[bandIndex];
}

/**
 * Parse bulk UTM coordinates from text
 * Format: each line as "easting northing" separated by space or comma
 */
export function parseUtmCoordinates(text: string, zone: string): LatLng[] {
  const result: LatLng[] = [];

  if (!text.trim()) return result;

  const validation = validateUtmZone(zone);
  if (!validation.valid) {
    console.error(validation.error);
    return result;
  }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Split by comma or space
    const parts = line.split(/[,\s]+/).map(p => p.trim());

    if (parts.length < 2) continue;

    const easting = parseFloat(parts[0]);
    const northing = parseFloat(parts[1]);

    if (Number.isNaN(easting) || Number.isNaN(northing)) {
      console.warn(`Skipped invalid line: ${line}`);
      continue;
    }

    const utm: UtmCoordinates = { zone, easting, northing };
    const converted = utmToLatLng(utm);

    if (converted) {
      result.push(converted);
    }
  }

  return result;
}
