-- Persists the optional free-text note from BadgeSelector.tsx's "Other"
-- flow (components/community/BadgeSelector.tsx's `feedback` textbox) — today
-- that text is typed, captured in local state, and thrown away on submit.
-- Deliberately NOT part of the ride_badges badge_type enum: picking "Other"
-- still gives no badge/count, exactly as before: it now also writes a note
-- row here when the text isn't empty. Feeds the weekly AI feedback summary
-- (see 060_community_summary_cache.sql).
CREATE TABLE public.feedback_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.ride_agreements(id) ON DELETE CASCADE,
  giver_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note         TEXT NOT NULL CHECK (char_length(note) > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.feedback_notes ENABLE ROW LEVEL SECURITY;

-- Mirrors ride_badges' "Users can give badges on completed agreements"
-- policy (002_community_features.sql) — same completed-agreement guard.
CREATE POLICY "Users can leave a note on completed agreements"
  ON public.feedback_notes FOR INSERT
  WITH CHECK (
    auth.uid() = giver_id
    AND EXISTS (
      SELECT 1 FROM public.ride_agreements ra
      WHERE ra.id     = agreement_id
        AND ra.status = 'completed'
        AND (ra.driver_id = auth.uid() OR ra.rider_id = auth.uid())
    )
  );

CREATE POLICY "Giver and receiver can view their own notes"
  ON public.feedback_notes FOR SELECT
  USING (auth.uid() = giver_id OR auth.uid() = receiver_id);

CREATE INDEX idx_feedback_notes_receiver  ON public.feedback_notes (receiver_id, created_at DESC);
CREATE INDEX idx_feedback_notes_agreement ON public.feedback_notes (agreement_id);
