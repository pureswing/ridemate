-- Optional license plate on vehicle_profiles — never required, kept private
-- (only shown to the other party once a ride_agreement exists, same as the
-- design's "kept private until you reveal" framing — enforced client-side
-- for now, same self-report trust model as the rest of vehicle_profiles).
ALTER TABLE public.vehicle_profiles
  ADD COLUMN IF NOT EXISTS plate TEXT;
