-- Replaces the original 10-value badge_type CHECK constraint with the real
-- 18-value catalog from ui_kits/ridemate-app/JobCompletionReview.jsx (14
-- driver badges + 5 rider badges, sharing 'great_chat'). The feature was
-- barely used before this rebuild, so this is a straight replacement, not
-- an additive migration — old values ('good_vibes', 'smooth_ride',
-- 'great_company') are dropped outright rather than kept dangling.
ALTER TABLE public.ride_badges DROP CONSTRAINT IF EXISTS ride_badges_badge_type_check;

ALTER TABLE public.ride_badges ADD CONSTRAINT ride_badges_badge_type_check
  CHECK (badge_type IN (
    'punctual', 'clean_car', 'friendly', 'good_music', 'fresh_air',
    'shares_snacks', 'pet_friendly', 'vip_service', 'good_navigation',
    'flexible_hours', 'city_expert', 'careful_cargo', 'fast_delivery',
    'on_time', 'respectful', 'tidy', 'communicative', 'great_chat'
  ));
