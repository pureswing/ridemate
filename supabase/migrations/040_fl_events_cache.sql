-- Route Intelligence, events piece — a weekly-refreshed, statewide (not
-- per-route) cache of Florida events from Ticketmaster's Discovery API.
-- One fetch/week serves every user's route lookup for that week, instead of
-- a live per-view call. See project discussion: traffic uses Google's
-- historical-data endpoint (cheaper than live traffic), weather refreshes
-- daily — this table is only the events half.
create table if not exists public.cached_fl_events (
  id uuid primary key default gen_random_uuid(),
  -- Ticketmaster's own event id — upsert key, so a re-fetch updates an
  -- event already known (e.g. a venue/time change) instead of duplicating it.
  external_id text not null unique,
  name text not null,
  segment text,             -- Ticketmaster's top-level category (Music, Sports, Arts & Theatre, ...)
  event_date timestamptz,
  venue_name text,
  venue_city text,
  venue_lat double precision,
  venue_lng double precision,
  url text,
  fetched_at timestamptz not null default now()
);

create index if not exists cached_fl_events_event_date_idx on public.cached_fl_events (event_date);
create index if not exists cached_fl_events_venue_city_idx on public.cached_fl_events (venue_city);

alter table public.cached_fl_events enable row level security;

-- Read-only for everyone — this is public event listing data, not anything
-- user-specific. Only the fetch-fl-events Edge Function (using the service
-- role key, which bypasses RLS entirely) ever writes to it.
create policy "Anyone can view cached FL events"
  on public.cached_fl_events for select
  using (true);
