-- Weekly schedule for the fetch-fl-events Edge Function, via pg_cron +
-- pg_net (the standard Supabase pattern for cron-triggered functions).
-- The service role key needed to call the function is read from Vault, NOT
-- hardcoded here — this file is checked into the repo, and a service role
-- key must never live in source control. Run the one-time Vault setup (see
-- the bottom of this file) yourself via the Supabase SQL editor before this
-- job's first run.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'fetch-fl-events-weekly',
  '0 6 * * 1', -- every Monday 06:00 UTC — start of week, ahead of US business hours
  $$
  select net.http_post(
    url := 'https://hcwuenikhlxlhkygnqzr.supabase.co/functions/v1/fetch-fl-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ─── One-time setup, run yourself (not by this migration) ───────────────
-- This migration will FAIL to actually fire the job until the secret below
-- exists — cron.schedule itself will still succeed, it's only the http_post
-- payload that needs it. Run once in the Supabase SQL editor (never commit
-- the real key to a file):
--
--   select vault.create_secret('<your service_role key>', 'service_role_key');
--
-- Find the key at: Supabase Dashboard → Project Settings → API → service_role.
