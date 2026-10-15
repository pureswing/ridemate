-- Current IRS business standard mileage rate, kept fresh automatically by
-- the fetch-irs-mileage-rate Edge Function (weekly pg_cron job below), which
-- parses the official table at irs.gov/tax-professionals/standard-mileage-rates.
-- The IRS publishes no API, and the rate can change mid-year (it did on
-- 2026-07-01: 72.5 -> 76 cents), so a hardcoded constant silently goes stale.
--
-- Single row (id = 1). effective_date is when the rate took effect per the
-- IRS table; checked_at is the last time the function successfully verified
-- it against irs.gov, even when nothing changed.
create table if not exists public.irs_mileage_rate (
  id smallint primary key default 1 check (id = 1),
  rate_per_mile numeric(5,3) not null,
  effective_date date not null,
  period_label text,
  source_url text not null default 'https://www.irs.gov/tax-professionals/standard-mileage-rates',
  checked_at timestamptz not null default now()
);

alter table public.irs_mileage_rate enable row level security;

-- Public reference data. Only the Edge Function (service role) writes.
create policy "Anyone can view IRS mileage rate"
  on public.irs_mileage_rate for select
  using (true);

-- Seed with the rate in effect when this migration was written, so the app
-- has a value before the job's first run.
insert into public.irs_mileage_rate (id, rate_per_mile, effective_date, period_label)
values (1, 0.76, '2026-07-01', '2026 (July 1 – Dec. 31)')
on conflict (id) do nothing;

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Same Vault-backed service_role_key secret as 041_fl_events_cron.sql.
select cron.schedule(
  'fetch-irs-mileage-rate-weekly',
  '0 7 * * 1', -- every Monday 07:00 UTC
  $$
  select net.http_post(
    url := 'https://hcwuenikhlxlhkygnqzr.supabase.co/functions/v1/fetch-irs-mileage-rate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
