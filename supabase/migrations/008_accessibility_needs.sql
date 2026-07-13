-- Self-described accessibility needs, on the profile (not per-post) so a rider
-- states them once and they carry across every request they post — same
-- self-report pattern as the rest of the app. Values are RM_ACCESS_OPTIONS
-- catalog ids: hard-of-hearing, low-vision, limited-mobility, no-heavy-lift,
-- wheelchair, prefers-text, service-animal, sensory. Validated in the RN form,
-- not with a DB CHECK, so the catalog can grow without a migration.
-- profiles is already public-read (USING (true)) and this isn't sensitive
-- data, so no RLS change is needed.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accessibility_needs TEXT[] NOT NULL DEFAULT '{}';
