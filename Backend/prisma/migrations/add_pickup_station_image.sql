-- Add image column to pickup_stations table
ALTER TABLE pickup_stations ADD COLUMN IF NOT EXISTS image TEXT;
