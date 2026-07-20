-- Real notifications table with read/unread state — the right foundation
-- for real push notifications later (this migration only handles the
-- in-app feed/badge; wiring actual push delivery is separate future work).
-- Rows are inserted by SECURITY DEFINER triggers below, never directly by
-- the client, so there's no INSERT policy for regular users.
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('message', 'agreement_created', 'agreement_completed', 'badge_received')),
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB NOT NULL DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their own notifications read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user   ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications (user_id) WHERE read_at IS NULL;

-- ── 1. New message → notify the other conversation participant ────────────
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  conv RECORD;
  recipient UUID;
  sender_name TEXT;
BEGIN
  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;
  recipient := CASE WHEN conv.post_owner_id = NEW.sender_id THEN conv.requester_id ELSE conv.post_owner_id END;
  SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    recipient,
    'message',
    COALESCE(sender_name, 'Someone') || ' sent you a message',
    LEFT(NEW.body, 120),
    jsonb_build_object('conversation_id', NEW.conversation_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- ── 2. Agreement created (offer accepted) → notify the driver ─────────────
CREATE OR REPLACE FUNCTION public.notify_agreement_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rider_name TEXT;
BEGIN
  SELECT full_name INTO rider_name FROM public.profiles WHERE id = NEW.rider_id;
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.driver_id,
    'agreement_created',
    COALESCE(rider_name, 'Someone') || ' confirmed your offer',
    'Trip confirmed — tap to view.',
    jsonb_build_object('agreement_id', NEW.id, 'post_id', NEW.post_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_agreement_insert
  AFTER INSERT ON public.ride_agreements
  FOR EACH ROW EXECUTE FUNCTION public.notify_agreement_created();

-- ── 3. Agreement completed → notify both parties once ──────────────────────
-- Fires AFTER UPDATE, so it sees NEW.status already flipped to 'completed'
-- by 002_community_features.sql's check_agreement_completion BEFORE trigger.
CREATE OR REPLACE FUNCTION public.notify_agreement_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES
      (NEW.driver_id, 'agreement_completed', 'Trip marked completed', 'Leave feedback for the other rider.', jsonb_build_object('agreement_id', NEW.id)),
      (NEW.rider_id, 'agreement_completed', 'Trip marked completed', 'Leave feedback for the other rider.', jsonb_build_object('agreement_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_agreement_completed
  AFTER UPDATE ON public.ride_agreements
  FOR EACH ROW EXECUTE FUNCTION public.notify_agreement_completed();

-- ── 4. Badge received ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_badge_received()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  giver_name TEXT;
BEGIN
  SELECT full_name INTO giver_name FROM public.profiles WHERE id = NEW.giver_id;
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.receiver_id,
    'badge_received',
    COALESCE(giver_name, 'Someone') || ' gave you a badge',
    NEW.badge_type,
    jsonb_build_object('agreement_id', NEW.agreement_id, 'badge_type', NEW.badge_type)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_badge_insert
  AFTER INSERT ON public.ride_badges
  FOR EACH ROW EXECUTE FUNCTION public.notify_badge_received();
