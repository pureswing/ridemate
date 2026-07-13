-- Real, honest version of "price analysis": a historical average donation for
-- a route, computed from actual past posts — not a hardcoded baseline, and
-- never framed as "the market price" the app is setting. Returns sample_size
-- alongside the average specifically so the app can refuse to show a
-- comparison when there isn't enough real data yet (the app-side rule: if
-- sample_size < 3, show "not enough data" instead of a misleading average).
-- v1 matches on exact origin/destination city pair (case-insensitive); a
-- mile-radius version can build on top of this once there's enough volume to
-- justify the added complexity of earthdistance/PostGIS.

CREATE OR REPLACE FUNCTION public.get_route_price_stats(
  p_origin_city TEXT,
  p_destination_city TEXT
)
RETURNS TABLE(avg_donation NUMERIC, sample_size BIGINT)
LANGUAGE sql STABLE
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
