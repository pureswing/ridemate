-- Wires the feed's price-analysis pill/modal (components/ride/PriceAnalysisSheet.tsx)
-- to the real per-route average from get_route_price_stats (009_route_price_stats.sql)
-- instead of the flat IRS-mileage-rate placeholder it used before, and adds a
-- platform-wide "not enough real data yet" gate: the feature stays hidden
-- everywhere until BoteGo has accumulated ~100 real priced ride posts —
-- below that, a handful of atypical prices could produce a misleading
-- comparison, which is worse than showing nothing.

-- get_route_price_stats was plain SQL (not SECURITY DEFINER), so it ran
-- under the CALLING user's RLS — ride_posts' own SELECT policy only exposes
-- 'active' (and visible-to-you) posts, silently undercounting every expired/
-- filled/cancelled historical post. Since this function's own purpose is a
-- HISTORICAL average ("computed from actual past posts" per its original
-- comment), that's a real gap, not a deliberate scope choice — fixed by
-- making it SECURITY DEFINER, same trust model as get_badge_counts.
CREATE OR REPLACE FUNCTION public.get_route_price_stats(
  p_origin_city TEXT,
  p_destination_city TEXT
)
RETURNS TABLE(avg_donation NUMERIC, sample_size BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    ROUND(AVG(suggested_donation), 2) AS avg_donation,
    COUNT(*) AS sample_size
  FROM public.ride_posts
  WHERE kind = 'ride'
    AND suggested_donation IS NOT NULL
    AND lower(origin_city) = lower(p_origin_city)
    AND lower(destination_city) = lower(p_destination_city);
$$;

GRANT EXECUTE ON FUNCTION public.get_route_price_stats(TEXT, TEXT) TO authenticated;

-- Global sample size behind the feed's price-analysis pill — a platform-wide
-- floor (~100 real priced rides), separate from get_route_price_stats' own
-- per-route floor (3) which only governs whether one specific route's
-- number looks reliable once the feature is already turned on.
CREATE OR REPLACE FUNCTION public.get_platform_ride_price_sample_size()
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)
  FROM public.ride_posts
  WHERE kind = 'ride' AND suggested_donation IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_ride_price_sample_size() TO authenticated;
