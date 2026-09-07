-- Sundays at 6am UTC — reuses the pg_cron/pg_net extensions and the
-- vault-stored service_role_key already set up by 041_fl_events_cron.sql,
-- same net.http_post shape as 043_route_intelligence_cron.sql.
select cron.schedule(
  'generate-weekly-feedback-summaries',
  '0 6 * * 0',
  $$
  select net.http_post(
    url := 'https://hcwuenikhlxlhkygnqzr.supabase.co/functions/v1/generate-weekly-feedback-summaries',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
