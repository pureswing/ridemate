-- Admin override + email-invite seeding for Donor access, ahead of real
-- payment processing (RevenueCat/IAP is blocked until the app is at least in
-- TestFlight/Play Console Internal Testing — see 2026-09-07 conversation).
-- Two independent tools:
--   1. is_admin: a single account (the app owner) can flip itself between
--      Donor/Free with no expiration, bypassing any gate.
--   2. invites: the admin seeds specific people by email; the app-download
--      email goes out via the send-invite-email Edge Function, and the
--      moment that email signs up it's granted Donor for donor_months
--      automatically (handle_new_user, below) instead of the usual Free row.

ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.profiles
SET is_admin = TRUE
WHERE id = (SELECT id FROM auth.users WHERE email = 't8311834@gmail.com');

CREATE TABLE public.invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  invited_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  donor_months  INTEGER NOT NULL DEFAULT 3,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sent', 'failed', 'accepted')),
  accepted_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at   TIMESTAMPTZ
);

CREATE INDEX idx_invites_email ON public.invites (email);
CREATE INDEX idx_invites_invited_by ON public.invites (invited_by);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Only admins ever touch this table (both from the client via the invite
-- screen, and there's nothing here a non-admin needs to see) — one FOR ALL
-- policy instead of a per-action split.
CREATE POLICY "Admins manage invites"
  ON public.invites FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin));

-- Extend the signup trigger: an invited email gets Donor for donor_months
-- instead of the default Free row, and its invite flips to 'accepted'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_invite public.invites%ROWTYPE;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  SELECT * INTO matched_invite
  FROM public.invites
  WHERE email = NEW.email AND status IN ('pending', 'sent')
  ORDER BY created_at DESC
  LIMIT 1;

  IF matched_invite.id IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, status, plan, period_start, period_end)
    VALUES (
      NEW.id, 'active', 'donor', NOW(),
      NOW() + (matched_invite.donor_months || ' months')::INTERVAL
    );

    UPDATE public.invites
    SET status = 'accepted', accepted_by = NEW.id, accepted_at = NOW()
    WHERE id = matched_invite.id;
  ELSE
    INSERT INTO public.subscriptions (user_id, status)
    VALUES (NEW.id, 'free');
  END IF;

  RETURN NEW;
END;
$$;
