-- Single-session-per-user enforcement (see app/_layout.tsx's useSessionGuard,
-- hooks/useAuth.ts's signIn). Logging in on a new device claims a fresh
-- active_session_id and revokes every other device's refresh token; any
-- other device with the app open right now finds out immediately via
-- Realtime (not just on its next token refresh) and signs itself out.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_session_id UUID;

-- Realtime wasn't used anywhere in this project before — profiles' existing
-- "readable by anyone" SELECT policy (001_initial.sql) already covers what
-- postgres_changes needs to authorize a subscriber's own row.
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- SECURITY INVOKER (default) — relies on the existing "Users can update
-- their own profile" RLS policy, same as any other self-service profile edit.
CREATE OR REPLACE FUNCTION public.claim_session()
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  new_session_id UUID := gen_random_uuid();
BEGIN
  UPDATE public.profiles SET active_session_id = new_session_id WHERE id = auth.uid();
  RETURN new_session_id;
END;
$$;
