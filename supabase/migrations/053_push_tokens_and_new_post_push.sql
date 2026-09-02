-- Reworks 052's new_post notifications: the user wants these delivered ONLY
-- as real OS push notifications (the phone's system notification shade),
-- never shown in the app's own in-app Notification Center screen. So this
-- migration stops inserting 'new_post' rows into public.notifications
-- entirely, and instead has the ride_posts INSERT trigger call an Edge
-- Function (via pg_net, same pattern as the cron jobs in 041/043/049) that
-- sends real Expo push notifications to opted-in recipients' devices.
--
-- Requires the same one-time Vault secret as 041_fl_events_cron.sql
-- ('service_role_key') — already set up if those cron jobs are running.

-- ── 1. Device push tokens ──────────────────────────────────────────────
CREATE TABLE public.push_tokens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_push_token   TEXT NOT NULL UNIQUE,
  platform          TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- UNIQUE on the token itself (not (user_id, token)) — a token belongs to one
-- device install, and re-registering it (reinstall, different account on the
-- same device) should move it, not duplicate it. The client upserts
-- on_conflict = expo_push_token.
CREATE POLICY "Users can view their own push tokens"
  ON public.push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can register their own push tokens"
  ON public.push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens"
  ON public.push_tokens FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens"
  ON public.push_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_push_tokens_user ON public.push_tokens (user_id);

-- ── 2. Undo 052's in-app notifications.new_post rows ───────────────────
-- 'new_post' never belongs in the CHECK list — it's never inserted into this
-- table now, only used as the push payload's own internal type marker. Any
-- rows 052's trigger already wrote before this migration ran must go first,
-- or tightening the CHECK constraint below fails (same pattern as
-- 050_remove_route_alert_notifications.sql).
DELETE FROM public.notifications WHERE type = 'new_post';

ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('message', 'agreement_created', 'agreement_completed', 'badge_received', 'trip_update'));

-- ── 3. New post → push (not in-app) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_new_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status <> 'active' OR NEW.visibility <> 'public' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://hcwuenikhlxlhkygnqzr.supabase.co/functions/v1/send-new-post-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'post_id', NEW.id,
      'user_id', NEW.user_id,
      'kind', NEW.kind,
      'origin_city', NEW.origin_city,
      'destination_city', NEW.destination_city
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger already exists from 052 pointing at this same function name;
-- CREATE OR REPLACE FUNCTION above already swapped its behavior. Drop +
-- recreate anyway so this migration is self-sufficient/idempotent on a
-- fresh database that never ran 052.
DROP TRIGGER IF EXISTS on_ride_post_new_post ON public.ride_posts;
CREATE TRIGGER on_ride_post_new_post
  AFTER INSERT ON public.ride_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_post();
