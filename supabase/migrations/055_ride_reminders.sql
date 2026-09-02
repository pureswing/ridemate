-- Wires up Settings' "Ride reminders" toggle for real: OS push only (same
-- push-only pattern as 053/054 — never shown in the in-app Notification
-- Center), sent 2 hours before a confirmed ride's scheduled_at, to whichever
-- side (driver or rider) has this toggle on. Scoped to kind = 'ride' only —
-- matches the toggle's own copy ("before your next scheduled ride"), not
-- package/hauling jobs.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_reminders BOOLEAN NOT NULL DEFAULT FALSE;

-- Tracks whether the 2-hour reminder already fired for this agreement, so
-- the 15-min cron tick below doesn't re-send it — same one-shot-flag pattern
-- as ride_post_insights.driver_prepickup_refreshed (042_route_intelligence.sql).
ALTER TABLE public.ride_agreements
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- pg_cron/pg_net and the service_role_key vault secret already set up by
-- migration 041 — reused here, not recreated.
SELECT cron.schedule(
  'send-ride-reminders-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hcwuenikhlxlhkygnqzr.supabase.co/functions/v1/send-ride-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
