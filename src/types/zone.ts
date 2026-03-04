export type ZoneStatus = 'active' | 'inactive';

/**
 * ZoneType - Now a relational type from database
 * Replaces hardcoded enum. Loaded dynamically from zone_types table.
 */
export interface ZoneType {
  id: string;
  name: string;
  color: string; // Hex color (e.g., '#ef4444')
  created_at?: string;
  updated_at?: string;
}

export interface ZonePoint {
  lat: number;
  lng: number;
}

export interface Zone {
  id: string;
  name: string;
  zone_type_id: string; // Foreign key to zone_types
  zone_type?: ZoneType; // Populated via join
  status: ZoneStatus;
  polygon: any; // GeoJSON polygon
  elevation_enabled?: boolean; // 3D geofencing feature
  min_elevation?: number | null; // meters above sea level
  max_elevation?: number | null; // meters above sea level
  created_at?: string;
  updated_at?: string;
}
