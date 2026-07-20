-- The "Firm price" / "Open to offers" toggle already exists in all three
-- post forms (app/post/ride|package|hauling.tsx) but was UI-only state,
-- never persisted — every price badge across the app hardcoded "OBO"
-- regardless of this toggle. Adds the real column so it can be read back.
ALTER TABLE public.ride_posts
  ADD COLUMN IF NOT EXISTS price_mode TEXT NOT NULL DEFAULT 'open'
    CHECK (price_mode IN ('firm', 'open'));
