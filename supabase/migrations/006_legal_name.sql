-- ============================================================
-- LEGAL NAME — private, kept OUT of public.profiles on purpose.
-- profiles has "Profiles are viewable by everyone" (USING (true)),
-- so anything added to that table is world-readable via the same
-- policy the public display name uses. legal_name must stay owner-only
-- until a reveal-on-accepted-offer / saved-driver path is built later.
-- ============================================================

CREATE TABLE public.profile_private (
  id          UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  legal_name  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own legal name"
  ON public.profile_private FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own legal name"
  ON public.profile_private FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own legal name"
  ON public.profile_private FOR UPDATE USING (auth.uid() = id);

CREATE TRIGGER profile_private_updated_at
  BEFORE UPDATE ON public.profile_private
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
