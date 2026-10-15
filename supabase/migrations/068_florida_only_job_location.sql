-- Jobs must happen in Florida: a post's origin and destination coordinates
-- must both fall inside the state. This restricts WHERE THE WORK IS DONE,
-- never who posts it — someone physically in New York can still book a MIA
-- pickup for next week; accounts/sign-up stay open everywhere.
--
-- Until now the only guard was client-side (the Places autocomplete's
-- 550 km strictbounds circle, which also covers south Georgia/Alabama), and
-- nothing stopped a direct API insert. This trigger is the real boundary;
-- the app mirrors the same polygon (constants/floridaBounds.ts) to reject a
-- bad address at pick time instead of at publish time.
--
-- Simplified Florida outline (lng, lat), native Postgres polygon — PostGIS
-- isn't installed and isn't needed for a containment check. Land borders
-- (AL along 31°N and the Perdido River; GA along the Chattahoochee, the
-- Ellicott line and the St. Marys River) are traced closely; the coast side
-- runs offshore with margin so beaches, the Keys and the Dry Tortugas are
-- inside while the Bahamas and Cuba are not. Verified against border towns
-- on both sides before shipping (e.g. Chattahoochee FL in / Thomasville GA
-- out, Perdido Key FL in / Orange Beach AL out, Fernandina FL in / St Marys
-- GA out). Keep in sync with constants/floridaBounds.ts.
--
-- Stops aren't covered here: they're stored as text only (details.stops),
-- with no coordinates to check — the app validates them at pick time.
CREATE OR REPLACE FUNCTION public.is_in_florida(lat DOUBLE PRECISION, lng DOUBLE PRECISION)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT polygon '((-87.60,31.00),(-85.00,31.00),(-84.86,30.71),(-82.22,30.57),(-82.04,30.75),(-81.44,30.71),(-80.90,30.71),(-80.20,29.50),(-79.90,27.50),(-79.95,25.30),(-80.05,24.90),(-81.00,24.35),(-82.20,24.30),(-83.15,24.45),(-83.40,26.50),(-83.80,28.20),(-84.60,29.30),(-85.60,29.40),(-86.60,30.10),(-87.53,30.15),(-87.53,30.28),(-87.43,30.45))'
    @> point(lng, lat);
$$;

-- Null coordinates are allowed through: some posts legitimately have no
-- point (e.g. hauling with disposal:'driver' has no destination).
CREATE OR REPLACE FUNCTION public.enforce_florida_job_location()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.origin_lat IS NOT NULL AND NEW.origin_lng IS NOT NULL
     AND NOT public.is_in_florida(NEW.origin_lat, NEW.origin_lng) THEN
    RAISE EXCEPTION 'JOB_OUTSIDE_FLORIDA: origin must be in Florida' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.destination_lat IS NOT NULL AND NEW.destination_lng IS NOT NULL
     AND NOT public.is_in_florida(NEW.destination_lat, NEW.destination_lng) THEN
    RAISE EXCEPTION 'JOB_OUTSIDE_FLORIDA: destination must be in Florida' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ride_posts_florida_only ON public.ride_posts;
CREATE TRIGGER ride_posts_florida_only
  BEFORE INSERT OR UPDATE OF origin_lat, origin_lng, destination_lat, destination_lng
  ON public.ride_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_florida_job_location();
