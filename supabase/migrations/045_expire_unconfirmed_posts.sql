-- A post whose job start time (scheduled_at) has passed with no confirmed
-- job — no ride_agreements row in 'active' (accepted offer) or 'completed'
-- state — auto-expires: status flips to 'expired', which is exactly what
-- hooks/useRides.ts's fetchPosts/getPostsByUser already filter out
-- (.eq('status', 'active')), so the post disappears from the feed without
-- deleting the row (matches every other status transition in this app —
-- cancel, etc. — soft, not a hard DELETE, so conversations/history survive).
-- Owners can still reach their own expired post directly (getPostById has
-- no status filter), same as an owner viewing a cancelled post today.
CREATE OR REPLACE FUNCTION public.expire_unconfirmed_posts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE public.ride_posts p
  SET status = 'expired'
  WHERE p.status = 'active'
    AND p.scheduled_at < NOW()
    AND NOT EXISTS (
      SELECT 1 FROM public.ride_agreements a
      WHERE a.post_id = p.id
        AND a.status IN ('active', 'completed')
    );

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$;

-- pg_cron/pg_net already enabled by migration 041 — reused here, not
-- recreated. Every 15 minutes, matching Route Intelligence's cadence
-- (043_route_intelligence_cron.sql) — frequent enough that a post
-- disappears from the feed shortly after its start time, without an
-- expensive per-minute schedule.
SELECT cron.schedule(
  'expire-unconfirmed-posts-15min',
  '*/15 * * * *',
  $$ SELECT public.expire_unconfirmed_posts(); $$
);
