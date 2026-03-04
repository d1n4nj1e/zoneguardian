-- Migration: Add elevation limit support (3D Geofencing)
-- Description: Add elevation_enabled, min_elevation, and max_elevation columns to zones table
-- Execute this in Supabase SQL Editor

BEGIN;

-- Add elevation columns to zones table
ALTER TABLE zones
ADD COLUMN IF NOT EXISTS elevation_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS min_elevation numeric NULL,
ADD COLUMN IF NOT EXISTS max_elevation numeric NULL;

-- Add constraints to ensure min < max when both are provided
ALTER TABLE zones
ADD CONSTRAINT elevation_range_check 
CHECK (
  NOT elevation_enabled OR 
  (min_elevation IS NULL AND max_elevation IS NULL) OR 
  (min_elevation IS NOT NULL AND max_elevation IS NOT NULL AND min_elevation < max_elevation)
);

-- Add index for faster queries when checking elevation limits
CREATE INDEX IF NOT EXISTS zones_elevation_idx ON zones(elevation_enabled, min_elevation, max_elevation);

-- Update RLS policy if needed (if your table has RLS enabled)
-- The existing policies should automatically apply to the new columns

COMMIT;

-- Verify migration success (optional, for testing)
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'zones' 
-- ORDER BY ordinal_position;
