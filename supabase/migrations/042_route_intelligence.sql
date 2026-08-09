-- Route Intelligence — one row per ride_post, holding the generated AI
-- insight plus the raw signals it was built from (traffic, weather, nearby
-- events). Refresh rules (per project discussion, not enforced by this
-- table alone — see the triggers and generate-post-insight/index.ts below):
--   * Generated once at post creation.
--   * Auto-refreshes every 24h from the last generation, regardless of
--     whether the job was accepted.
--   * If the post is edited (origin/destination/scheduled_at changes),
--     the 24h counter resets — treated like a fresh creation.
--   * If an agreement is accepted, the DRIVER additionally gets one extra
--     refresh 2 hours before the job's scheduled_at.
create table if not exists public.ride_post_insights (
  post_id uuid primary key references public.ride_posts(id) on delete cascade,
  traffic_duration_seconds int,
  baseline_duration_seconds int,
  weather_temp_f numeric,
  weather_code int,
  -- Small denormalized snapshot, not a live join — nearby events change
  -- weekly at most, no need to re-match cached_fl_events on every read.
  nearby_events jsonb not null default '[]'::jsonb,
  insight_text text,
  generated_at timestamptz,
  -- Cron (generate-post-insight) picks up any row where this is due.
  next_refresh_at timestamptz not null default now(),
  -- Set when an agreement is accepted; cleared (refreshed flag) once that
  -- one extra pre-pickup refresh has actually run, so it only fires once.
  driver_prepickup_refresh_at timestamptz,
  driver_prepickup_refreshed boolean not null default false
);

alter table public.ride_post_insights enable row level security;

-- No sensitive data here (route timing/weather/nearby events, not billing
-- or contact info) — readable by anyone who could already see the post,
-- same as cached_fl_events's own "public read" policy.
create policy "Anyone can view post insights"
  on public.ride_post_insights for select
  using (true);

-- New post → seed a row so the next cron tick picks it up almost
-- immediately, without blocking post submission on a synchronous
-- Directions/weather/OpenAI round-trip.
create or replace function public.seed_ride_post_insight()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.ride_post_insights (post_id, next_refresh_at)
  values (new.id, now())
  on conflict (post_id) do nothing;
  return new;
end;
$$;

create trigger ride_posts_seed_insight
  after insert on public.ride_posts
  for each row execute function public.seed_ride_post_insight();

-- Post edited (route or timing actually changed) → reset the 24h counter,
-- same as a fresh creation.
create or replace function public.reset_ride_post_insight_on_edit()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.origin_lat is distinct from old.origin_lat
     or new.origin_lng is distinct from old.origin_lng
     or new.destination_lat is distinct from old.destination_lat
     or new.destination_lng is distinct from old.destination_lng
     or new.scheduled_at is distinct from old.scheduled_at
  then
    update public.ride_post_insights
      set next_refresh_at = now()
      where post_id = new.id;
  end if;
  return new;
end;
$$;

create trigger ride_posts_reset_insight_on_edit
  after update on public.ride_posts
  for each row execute function public.reset_ride_post_insight_on_edit();

-- Agreement accepted (pending → active) → schedule the driver's one extra
-- pre-pickup refresh, 2 hours before the post's scheduled_at.
create or replace function public.schedule_driver_prepickup_insight()
returns trigger
language plpgsql
security definer
as $$
declare
  v_scheduled_at timestamptz;
begin
  if new.status = 'active' and (old.status is null or old.status <> 'active') then
    select scheduled_at into v_scheduled_at from public.ride_posts where id = new.post_id;
    if v_scheduled_at is not null then
      update public.ride_post_insights
        set driver_prepickup_refresh_at = v_scheduled_at - interval '2 hours',
            driver_prepickup_refreshed = false
        where post_id = new.post_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger ride_agreements_schedule_prepickup_insight
  after insert or update on public.ride_agreements
  for each row execute function public.schedule_driver_prepickup_insight();
