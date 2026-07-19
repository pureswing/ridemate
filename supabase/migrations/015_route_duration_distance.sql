-- Trip duration/distance text, read off the same Directions API response
-- already fetched once at post-creation time for the route map polyline
-- (services/routeMap.ts) — no new API calls, just two more stored fields
-- from a call we already make. Nullable: posts created before this existed,
-- or where the Directions call failed, simply have no value to show.
ALTER TABLE public.ride_posts
  ADD COLUMN IF NOT EXISTS duration_text TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS distance_text TEXT;
