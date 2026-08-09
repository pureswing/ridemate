-- Every 15 minutes, not weekly like fetch-fl-events — this job needs
-- reasonable precision for the "2 hours before pickup" driver refresh, and
-- for new posts to get their first insight soon after creation rather than
-- sitting empty for up to a day. pg_cron/pg_net and the vault secret were
-- already set up by migration 041 — reused here, not recreated.
select cron.schedule(
  'generate-post-insight-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://hcwuenikhlxlhkygnqzr.supabase.co/functions/v1/generate-post-insight',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
