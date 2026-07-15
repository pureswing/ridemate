-- Up to 2 vehicles per user, one per purpose: regular rides/courier, and a
-- separate one for hauling (matches the design's two-slot vehicle picker).
-- Was UNIQUE(user_id) — replaced with UNIQUE(user_id, kind) so each user can
-- have at most one vehicle per kind, i.e. at most 2 total.

ALTER TABLE public.vehicle_profiles
  DROP CONSTRAINT IF EXISTS vehicle_profiles_user_id_key;

ALTER TABLE public.vehicle_profiles
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'rides_courier'
    CHECK (kind IN ('rides_courier', 'hauling'));

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_profiles_user_id_kind_key
  ON public.vehicle_profiles(user_id, kind);
