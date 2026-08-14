-- Daily, matching FDOT's own "updated nightly" refresh cadence for this
-- feature service (see 048's comment) — no point polling more often than
-- the source data changes. pg_cron/pg_net and the vault secret were already
-- set up by migration 041 — reused here, not recreated.
select cron.schedule(
  'fetch-fl-construction-daily',
  '0 10 * * *',
  $$
  select net.http_post(
    url := 'https://hcwuenikhlxlhkygnqzr.supabase.co/functions/v1/fetch-fl-construction',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
