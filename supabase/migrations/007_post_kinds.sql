-- Real schema for the ride/package/hauling post kinds (previously only
-- imagined in the Claude Design prototype's mock data, never in the real
-- table). Promoted to real columns: kind, round_trip, airport, airport_leg,
-- flight_number — all simple ride-specific scalars the app already partially
-- collects (post.tsx already looks up flight info via lookupFlight() and
-- silently drops it — this is what finally persists it). Everything else
-- kind-specific (package content declarations + prohibited-item confirmations
-- + oath, hauling load/access/prohibited items, ride comfort/climate/child-seat
-- preferences) lives in `details` jsonb — deeply nested, kind-varying, and not
-- needed for SQL-level filtering yet.

ALTER TABLE public.ride_posts
  ADD COLUMN IF NOT EXISTS kind          TEXT NOT NULL DEFAULT 'ride' CHECK (kind IN ('ride', 'package', 'hauling')),
  ADD COLUMN IF NOT EXISTS round_trip    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS airport       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS airport_leg   TEXT CHECK (airport_leg IN ('to', 'from')),
  ADD COLUMN IF NOT EXISTS flight_number TEXT,
  ADD COLUMN IF NOT EXISTS details       JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_ride_posts_kind ON public.ride_posts(kind);
