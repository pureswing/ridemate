-- "Report profile" — the public user-profile screen's report sheet.
-- Reports are write-only from the app's perspective (no moderation UI yet);
-- a human reviews them directly in the Supabase dashboard for now.
CREATE TABLE public.user_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reasons       TEXT[] NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can file a report"
  ON public.user_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id AND reporter_id <> reported_id);

CREATE POLICY "Users can view their own filed reports"
  ON public.user_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE INDEX idx_user_reports_reported ON public.user_reports (reported_id);
