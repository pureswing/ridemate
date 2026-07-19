-- Free-text accessibility note ("Anything else"), shown alongside the
-- accessibility_needs chips on the dedicated Accessibility screen — see
-- app/profile/accessibility.tsx. Same non-sensitive, public-read profile
-- data as accessibility_needs (008_accessibility_needs.sql), no RLS change.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accessibility_note TEXT;
