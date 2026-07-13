-- Add per-amenity details (choices + note) as JSONB to vehicle_profiles
ALTER TABLE public.vehicle_profiles
  ADD COLUMN IF NOT EXISTS amenity_details jsonb DEFAULT '{}';
