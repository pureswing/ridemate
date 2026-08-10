-- 033_post_privacy_on_agreement.sql flips a post to 'filled' the instant an
-- agreement is INSERTed, and back to 'active' if that agreement is
-- cancelled — but nothing handled the 'completed' transition, so a post
-- whose agreement predates 033 (or reached 'completed' through any path
-- that skipped the INSERT trigger) could sit at status='active' forever
-- with a finished job attached, showing up on the Home feed as if still
-- open. This adds the missing leg, mirroring 033's own trigger shape.
--
-- Client-side note: this must be a DB-level fix, not a client query that
-- excludes "posts with a completed agreement" — ride_agreements' RLS only
-- lets a user see agreements THEY are a party to (auth.uid() = driver_id OR
-- rider_id), so a client-side exclusion list is silently incomplete for
-- every other viewer. Flipping the post's own status column instead works
-- for everyone, since ride_posts' own visibility policy already exists.
CREATE OR REPLACE FUNCTION public.set_post_filled_on_agreement_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE public.ride_posts SET status = 'filled' WHERE id = NEW.post_id AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_agreement_completed_fill_post
  AFTER UPDATE ON public.ride_agreements
  FOR EACH ROW EXECUTE FUNCTION public.set_post_filled_on_agreement_completed();

-- One-time backfill for existing rows already in this mismatched state.
UPDATE public.ride_posts p
SET status = 'filled'
WHERE p.status = 'active'
  AND EXISTS (
    SELECT 1 FROM public.ride_agreements a
    WHERE a.post_id = p.id AND a.status = 'completed'
  );
