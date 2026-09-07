-- The Dashboard's cancellation stats need to distinguish "cancelled by you"
-- from "cancelled on you", but ride_agreements never recorded WHO flipped
-- status to 'cancelled' — only that it happened. Adds that column and backs
-- it with a real cross-user community-average RPC (RLS on ride_agreements
-- only exposes a user's own rows, so the community average can't be
-- computed client-side — same reason get_route_price_stats/get_badge_counts
-- are SECURITY DEFINER functions rather than plain selects).

ALTER TABLE public.ride_agreements
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id);

-- Average notice given (hours between the cancellation and the job's
-- scheduled time) across every cancelled agreement platform-wide. updated_at
-- already reflects the cancellation moment via the existing set_updated_at
-- trigger, so no new timestamp column is needed. Negative notice (cancelled
-- after the scheduled time) is clamped to 0 rather than dragging the average
-- into a confusing negative range.
CREATE OR REPLACE FUNCTION public.get_cancellation_community_avg()
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(AVG(GREATEST(0, EXTRACT(EPOCH FROM (p.scheduled_at - a.updated_at)) / 3600)), 0)
  FROM public.ride_agreements a
  JOIN public.ride_posts p ON p.id = a.post_id
  WHERE a.status = 'cancelled' AND a.cancelled_by IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_cancellation_community_avg() TO authenticated;
