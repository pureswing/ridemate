-- Seed data for testing get_route_price_stats() (009_route_price_stats.sql)
-- with realistic, route-consistent numbers instead of random ones — donation
-- amounts cluster sensibly per route so the average means something, and two
-- routes are deliberately left with < 3 posts to prove the app's
-- "not enough data yet" rule actually triggers.
--
-- Run this in the Supabase SQL editor (not through the app) — that context
-- runs as a privileged role and bypasses the ride_posts RLS policies, so it
-- works against any real profile that already exists. Requires at least one
-- row in public.profiles (e.g. the test account already used this session).
--
-- Sample sizes by route:
--   Miami -> Orlando            5 posts, ~$27-32   (plenty of data)
--   Miami -> Tampa              4 posts, ~$20-26   (plenty of data)
--   Orlando -> Tampa            2 posts, ~$18-19   (below the sample_size < 3 floor)
--   Miami -> Fort Lauderdale    1 post,  $15        (below the sample_size < 3 floor)

WITH seed_user AS (
  SELECT id FROM public.profiles ORDER BY created_at LIMIT 1
)
INSERT INTO public.ride_posts
  (user_id, type, kind, origin_city, destination_city, scheduled_at, seats_available, suggested_donation, contact_method, description, status)
SELECT seed_user.id, v.type, 'ride', v.origin_city, v.destination_city, v.scheduled_at::timestamptz, v.seats_available, v.suggested_donation, 'in_app', v.description, v.status
FROM seed_user, (VALUES
  -- Miami -> Orlando (5)
  ('offer',   'Miami', 'Orlando', now() - interval '20 days', 3, 28.00, 'Historical sample — Miami to Orlando', 'expired'),
  ('offer',   'Miami', 'Orlando', now() - interval '14 days', 4, 30.00, 'Historical sample — Miami to Orlando', 'expired'),
  ('request', 'Miami', 'Orlando', now() - interval '9 days',  1, 27.00, 'Historical sample — Miami to Orlando', 'expired'),
  ('offer',   'Miami', 'Orlando', now() - interval '5 days',  2, 32.00, 'Historical sample — Miami to Orlando', 'expired'),
  ('offer',   'Miami', 'Orlando', now() + interval '3 days',  3, 29.00, 'Historical sample — Miami to Orlando', 'active'),

  -- Miami -> Tampa (4)
  ('offer',   'Miami', 'Tampa', now() - interval '18 days', 2, 22.00, 'Historical sample — Miami to Tampa', 'expired'),
  ('request', 'Miami', 'Tampa', now() - interval '11 days', 1, 20.00, 'Historical sample — Miami to Tampa', 'expired'),
  ('offer',   'Miami', 'Tampa', now() - interval '6 days',  3, 26.00, 'Historical sample — Miami to Tampa', 'expired'),
  ('offer',   'Miami', 'Tampa', now() + interval '2 days',  2, 24.00, 'Historical sample — Miami to Tampa', 'active'),

  -- Orlando -> Tampa (2 — intentionally under the sample_size floor)
  ('offer',   'Orlando', 'Tampa', now() - interval '8 days', 2, 18.00, 'Historical sample — Orlando to Tampa', 'expired'),
  ('offer',   'Orlando', 'Tampa', now() + interval '4 days', 3, 19.00, 'Historical sample — Orlando to Tampa', 'active'),

  -- Miami -> Fort Lauderdale (1 — intentionally under the sample_size floor)
  ('request', 'Miami', 'Fort Lauderdale', now() + interval '1 day', 1, 15.00, 'Historical sample — Miami to Fort Lauderdale', 'active')
) AS v(type, origin_city, destination_city, scheduled_at, seats_available, suggested_donation, description, status);

-- Sanity check once applied:
--   select * from get_route_price_stats('Miami', 'Orlando');       -- expect avg ~29.20, sample_size 5
--   select * from get_route_price_stats('Orlando', 'Tampa');        -- expect sample_size 2 (below the floor)
--   select * from get_route_price_stats('Tampa', 'Miami');          -- expect sample_size 0 (direction matters — city pair is directional)
