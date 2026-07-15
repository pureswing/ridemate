-- Area of work (free text, matches the free-text convention already used by
-- ride_posts.origin_city/destination_city — no controlled city list exists
-- yet, so this stays consistent rather than introducing a mismatched one)
-- and an optional public bio.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_city TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT CHECK (bio IS NULL OR char_length(bio) <= 280);
