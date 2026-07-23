-- Once a ride_agreement exists for a post, the post should stop being
-- publicly listed — only the poster and the two agreement parties can
-- still see it (e.g. to open the detail screen from the confirmation
-- system message or the messages tab). It automatically becomes public
-- again the moment either party CANCELS the agreement (not on no_show —
-- by then the scheduled time has already passed, so re-listing it publicly
-- doesn't make sense).
--
-- Reuses the existing 'filled' status value from ride_posts' original CHECK
-- constraint (001_initial.sql) — it was declared from the start but never
-- actually set by any code path until now. hooks/useRides.ts's feed query
-- already filters .eq('status','active'), so a 'filled' post is
-- automatically excluded from the feed with no app-side change needed;
-- this migration only has to (1) extend the RLS SELECT policy so the
-- involved parties can still open it directly, and (2) flip the status
-- automatically via triggers on ride_agreements.

DROP POLICY IF EXISTS "Active posts viewable by visibility rules" ON public.ride_posts;

CREATE POLICY "Posts viewable by visibility rules"
  ON public.ride_posts FOR SELECT
  USING (
    (
      status = 'active'
      AND (
        visibility = 'public'
        OR goes_public_at IS NULL
        OR NOW() >= goes_public_at
        OR user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_favorites uf
          WHERE uf.driver_id = auth.uid()
            AND uf.rider_id  = ride_posts.user_id
        )
      )
    )
    OR (
      status = 'filled'
      AND (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.ride_agreements ra
          WHERE ra.post_id = ride_posts.id
            AND (ra.driver_id = auth.uid() OR ra.rider_id = auth.uid())
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.set_post_filled_on_agreement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.ride_posts SET status = 'filled' WHERE id = NEW.post_id AND status = 'active';
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_agreement_created_fill_post
  AFTER INSERT ON public.ride_agreements
  FOR EACH ROW EXECUTE FUNCTION public.set_post_filled_on_agreement();

CREATE OR REPLACE FUNCTION public.set_post_active_on_agreement_cancelled()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.ride_posts SET status = 'active' WHERE id = NEW.post_id AND status = 'filled';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_agreement_cancelled_reopen_post
  AFTER UPDATE ON public.ride_agreements
  FOR EACH ROW EXECUTE FUNCTION public.set_post_active_on_agreement_cancelled();
