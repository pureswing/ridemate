-- Post expiry + re-post (2026-11-24).
--
-- 1. A post now expires AT ITS SCHEDULED TIME. expires_at used to default
--    to created_at + 30 days, so a post scheduled further out vanished from
--    the feed before its date (and one scheduled sooner lingered). A BEFORE
--    trigger now keeps expires_at = scheduled_at on every insert/update.
-- 2. When scheduled_at passes with no confirmed agreement, the
--    expire-unconfirmed-posts cron no longer hard-deletes the post: it flips
--    status to 'expired' and stamps expired_at. The post then sits in the
--    owner's "Re-post" screen for a grace window — 72 h for Free, 30 days for
--    Donors (decided at cleanup time) — before the cron deletes it for real.
--    Conversations about it are kept during that window.
-- 3. Re-posting = the owner editing the expired row with a future date and
--    status 'active' (normal UPDATE, existing RLS). handle_post_repost()
--    resets it like a fresh post; on_post_reposted():
--      - cancels stale pending offers (cancelled_by stays NULL so they never
--        count as anyone's cancellation in Dashboard stats),
--      - drops a system message into every conversation about the post
--        saying what changed (rendered/translated client-side from the
--        'system:post_reposted:<changes>' marker),
--      - re-sends the "new post" push to subscribers, at most once per 24 h
--        per post, so unlimited re-posting can't spam anyone.
-- 4. New notification types for the cron's pushes: post_expired,
--    post_expiring (reminder before deletion), no_offers (nudge), plus
--    post_reposted (in-app row for the people in those conversations).

ALTER TABLE public.ride_posts
  ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expiry_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_offer_nudge_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reposted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS repost_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_publish_push_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('message', 'agreement_created', 'agreement_completed', 'badge_received', 'trip_update',
                  'post_expired', 'post_expiring', 'post_reposted', 'no_offers'));

-- ── 1. expires_at follows scheduled_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_post_expires_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.expires_at := NEW.scheduled_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ride_posts_sync_expires_at ON public.ride_posts;
CREATE TRIGGER ride_posts_sync_expires_at
  BEFORE INSERT OR UPDATE OF scheduled_at ON public.ride_posts
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_expires_at();

-- Backfill live posts. Only touches expires_at, which no AFTER UPDATE
-- trigger reacts to (trip_update / insight reset compare other columns).
UPDATE public.ride_posts SET expires_at = scheduled_at
WHERE status IN ('active', 'filled') AND expires_at IS DISTINCT FROM scheduled_at;

-- ── 3. Re-post ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_post_repost()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'expired' AND NEW.status = 'active' THEN
    IF NEW.scheduled_at <= NOW() THEN
      RAISE EXCEPTION 'REPOST_NEEDS_FUTURE_DATE: choose a date in the future to re-post' USING ERRCODE = 'check_violation';
    END IF;
    NEW.reposted_at := NOW();
    NEW.repost_count := OLD.repost_count + 1;
    NEW.expired_at := NULL;
    NEW.expiry_reminder_sent_at := NULL;
    NEW.no_offer_nudge_sent_at := NULL;
    NEW.views_count := 0;
    -- A re-post is a fresh listing: no "rescheduled from…/price changed"
    -- badges carried over from the old run.
    NEW.original_scheduled_at := NULL;
    NEW.original_suggested_donation := NULL;
    NEW.info_updated := FALSE;
    NEW.edited_at := NULL;
    IF NEW.visibility = 'public'
       AND (OLD.last_publish_push_at IS NULL OR OLD.last_publish_push_at < NOW() - INTERVAL '24 hours') THEN
      NEW.last_publish_push_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ride_posts_handle_repost ON public.ride_posts;
CREATE TRIGGER ride_posts_handle_repost
  BEFORE UPDATE OF status ON public.ride_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_post_repost();

CREATE OR REPLACE FUNCTION public.on_post_reposted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_changes TEXT[] := ARRAY[]::TEXT[];
  v_conv RECORD;
BEGIN
  IF NOT (OLD.status = 'expired' AND NEW.status = 'active') THEN
    RETURN NEW;
  END IF;

  UPDATE public.ride_agreements SET status = 'cancelled'
  WHERE post_id = NEW.id AND status = 'pending';

  IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN v_changes := array_append(v_changes, 'date'); END IF;
  IF NEW.suggested_donation IS DISTINCT FROM OLD.suggested_donation THEN v_changes := array_append(v_changes, 'price'); END IF;
  IF NEW.description IS DISTINCT FROM OLD.description OR NEW.details IS DISTINCT FROM OLD.details THEN v_changes := array_append(v_changes, 'notes'); END IF;
  IF NEW.origin_address IS DISTINCT FROM OLD.origin_address OR NEW.destination_address IS DISTINCT FROM OLD.destination_address
     OR NEW.origin_city IS DISTINCT FROM OLD.origin_city OR NEW.destination_city IS DISTINCT FROM OLD.destination_city THEN
    v_changes := array_append(v_changes, 'route');
  END IF;

  FOR v_conv IN SELECT id FROM public.conversations WHERE post_id = NEW.id LOOP
    INSERT INTO public.messages (conversation_id, sender_id, body, is_system)
    VALUES (v_conv.id, NEW.user_id, 'system:post_reposted:' || array_to_string(v_changes, ','), TRUE);
  END LOOP;

  IF NEW.last_publish_push_at IS DISTINCT FROM OLD.last_publish_push_at THEN
    PERFORM net.http_post(
      url := 'https://hcwuenikhlxlhkygnqzr.supabase.co/functions/v1/send-new-post-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := jsonb_build_object(
        'post_id', NEW.id, 'user_id', NEW.user_id, 'kind', NEW.kind,
        'origin_city', NEW.origin_city, 'destination_city', NEW.destination_city
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Named to sort before on_ride_post_trip_update: AFTER triggers fire in name
-- order, and the stale pending offers must already be cancelled when that one
-- runs, or every offerer would also get a redundant "Trip updated" alert.
DROP TRIGGER IF EXISTS on_post_repost_cleanup ON public.ride_posts;
CREATE TRIGGER on_post_repost_cleanup
  AFTER UPDATE OF status ON public.ride_posts
  FOR EACH ROW EXECUTE FUNCTION public.on_post_reposted();

-- ── System message notifications ──────────────────────────────────────────
-- Same as 054's notify_new_message, plus: a 'system:post_reposted:…' marker
-- becomes a readable 'post_reposted' notification (instead of "X sent you a
-- message: system:…") and is pushed to the other participant via
-- send-user-push. Ordinary messages behave exactly as before.
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  conv RECORD;
  recipient UUID;
  sender_name TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;
  recipient := CASE WHEN conv.post_owner_id = NEW.sender_id THEN conv.requester_id ELSE conv.post_owner_id END;
  SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  IF NEW.is_system AND NEW.body LIKE 'system:post_reposted:%' THEN
    v_title := 'A post you messaged about was re-posted';
    v_body := 'It has a new date. Check the details — the time, offer or notes may have changed since your last message.';
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (recipient, 'post_reposted', v_title, v_body,
            jsonb_build_object('conversation_id', NEW.conversation_id, 'post_id', conv.post_id));
    PERFORM net.http_post(
      url := 'https://hcwuenikhlxlhkygnqzr.supabase.co/functions/v1/send-user-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := jsonb_build_object(
        'user_ids', jsonb_build_array(recipient), 'title', v_title, 'body', v_body,
        'data', jsonb_build_object('conversation_id', NEW.conversation_id)
      )
    );
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    recipient,
    'message',
    COALESCE(sender_name, 'Someone') || ' sent you a message',
    LEFT(NEW.body, 120),
    jsonb_build_object('conversation_id', NEW.conversation_id)
  );

  -- Push only when the recipient is the post's creator (i.e. a requester
  -- messaged them about their own post) — see 054's header comment.
  IF recipient = conv.post_owner_id THEN
    PERFORM net.http_post(
      url := 'https://hcwuenikhlxlhkygnqzr.supabase.co/functions/v1/send-message-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := jsonb_build_object(
        'recipient_id', recipient,
        'sender_name', COALESCE(sender_name, 'Someone'),
        'body_preview', LEFT(NEW.body, 120),
        'conversation_id', NEW.conversation_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
