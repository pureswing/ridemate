-- Route Intelligence, construction piece — a daily-refreshed, statewide
-- cache of FDOT's public "Active Construction Projects" feature service
-- (gis.fdot.gov/arcgis/rest/services/Active_Construction_Projects), the same
-- open data source that backs FL511's own construction layer. No API key
-- required. One fetch/day serves every route lookup for that day, same
-- pattern as cached_fl_events.
--
-- Each row is one construction segment's bounding box (not the full
-- polyline — this app has no PostGIS, and a simple axis-aligned bbox
-- overlap check against a route's own bbox is close enough for an
-- AI-summarized "heads up" note, not turn-by-turn routing).
create table if not exists public.cached_fl_construction (
  id uuid primary key default gen_random_uuid(),
  -- FDOT's ContractId + RoadwayId + BeginMP together identify one segment —
  -- a single contract commonly covers several segments/roads, so ContractId
  -- alone isn't unique. Upsert key.
  external_id text not null unique,
  contract_id text,
  county text,
  description text,
  roadway_id text,
  start_date timestamptz,
  end_date timestamptz,
  min_lat double precision not null,
  max_lat double precision not null,
  min_lng double precision not null,
  max_lng double precision not null,
  fetched_at timestamptz not null default now()
);

create index if not exists cached_fl_construction_end_date_idx on public.cached_fl_construction (end_date);
create index if not exists cached_fl_construction_bbox_idx on public.cached_fl_construction (min_lat, max_lat, min_lng, max_lng);

alter table public.cached_fl_construction enable row level security;

-- Read-only for everyone — public FDOT project data, not user-specific.
-- Only the fetch-fl-construction Edge Function (service role key, bypasses
-- RLS) ever writes to it.
create policy "Anyone can view cached FL construction"
  on public.cached_fl_construction for select
  using (true);

-- Matched construction segments, denormalized onto the insight row itself —
-- same reasoning as ride_post_insights.nearby_events (small snapshot, not a
-- live join; construction status changes daily at most).
alter table public.ride_post_insights
  add column if not exists road_construction jsonb not null default '[]'::jsonb;
