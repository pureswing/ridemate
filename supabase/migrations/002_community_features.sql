-- ============================================================
-- RideMate — Community Features Migration
-- ride_agreements, user_favorites, ride_badges, no_show_reports
-- post visibility (private/public with delayed release)
-- ============================================================

-- ── 1. Post visibility columns (no RLS policy yet — user_favorites doesn't exist) ──

ALTER TABLE public.ride_posts
  ADD COLUMN visibility       TEXT NOT NULL DEFAULT 'public'
                                CHECK (visibility IN ('public', 'private')),
  ADD COLUMN goes_public_at   TIMESTAMPTZ,
  ADD COLUMN registration_city TEXT;

UPDATE public.ride_posts SET visibility = 'public';

-- ── 2. User favorites (must exist BEFORE the ride_posts RLS policy) ───────────

CREATE TABLE public.user_favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  city       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rider_id, driver_id)
);

CREATE OR REPLACE FUNCTION public.check_favorites_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.user_favorites
  WHERE rider_id = NEW.rider_id AND city = NEW.city;

  IF current_count >= 5 THEN
    RAISE EXCEPTION 'favorites_limit_reached';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_favorites_limit
  BEFORE INSERT ON public.user_favorites
  FOR EACH ROW EXECUTE FUNCTION public.check_favorites_limit();

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders manage their own favorites"
  ON public.user_favorites FOR ALL
  USING (auth.uid() = rider_id)
  WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Drivers can see who favorited them"
  ON public.user_favorites FOR SELECT
  USING (auth.uid() = driver_id);

CREATE INDEX idx_favorites_rider  ON public.user_favorites (rider_id);
CREATE INDEX idx_favorites_driver ON public.user_favorites (driver_id);
CREATE INDEX idx_favorites_city   ON public.user_favorites (rider_id, city);

-- ── 3. ride_posts RLS — now safe to reference user_favorites ─────────────────

DROP POLICY IF EXISTS "Active posts are viewable by everyone" ON public.ride_posts;

CREATE POLICY "Active posts viewable by visibility rules"
  ON public.ride_posts FOR SELECT
  USING (
    status = 'active'
    AND (
      visibility = 'public'
      OR goes_public_at IS NULL
      OR NOW() >= goes_public_at
      OR user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.user_favorites uf
        WHERE uf.driver_id = auth.uid()
          AND uf.rider_id  = ride_posts.user_id
      )
    )
  );

-- ── 4. Ride agreements ────────────────────────────────────────────────────────

CREATE TABLE public.ride_agreements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id             UUID NOT NULL REFERENCES public.ride_posts(id) ON DELETE CASCADE,
  driver_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rider_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_confirmed_at TIMESTAMPTZ,
  rider_confirmed_at  TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','active','completed','cancelled','no_show')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, driver_id, rider_id)
);

ALTER TABLE public.ride_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view their agreements"
  ON public.ride_agreements FOR SELECT
  USING (auth.uid() = driver_id OR auth.uid() = rider_id);

CREATE POLICY "Rider can create agreement"
  ON public.ride_agreements FOR INSERT
  WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Parties can update their agreements"
  ON public.ride_agreements FOR UPDATE
  USING (auth.uid() = driver_id OR auth.uid() = rider_id);

CREATE TRIGGER ride_agreements_updated_at
  BEFORE UPDATE ON public.ride_agreements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.check_agreement_completion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.driver_confirmed_at IS NOT NULL AND NEW.rider_confirmed_at IS NOT NULL THEN
    NEW.status = 'completed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_agreement_both_confirmed
  BEFORE UPDATE ON public.ride_agreements
  FOR EACH ROW EXECUTE FUNCTION public.check_agreement_completion();

CREATE INDEX idx_agreements_driver ON public.ride_agreements (driver_id);
CREATE INDEX idx_agreements_rider  ON public.ride_agreements (rider_id);
CREATE INDEX idx_agreements_post   ON public.ride_agreements (post_id);

-- ── 5. Ride badges ────────────────────────────────────────────────────────────

CREATE TABLE public.ride_badges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.ride_agreements(id) ON DELETE CASCADE,
  giver_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type   TEXT NOT NULL CHECK (badge_type IN (
    'clean_car', 'punctual', 'friendly', 'good_vibes', 'smooth_ride',
    'on_time', 'communicative', 'respectful', 'tidy', 'great_company'
  )),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agreement_id, giver_id, badge_type)
);

ALTER TABLE public.ride_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can give badges on completed agreements"
  ON public.ride_badges FOR INSERT
  WITH CHECK (
    auth.uid() = giver_id
    AND EXISTS (
      SELECT 1 FROM public.ride_agreements ra
      WHERE ra.id     = agreement_id
        AND ra.status = 'completed'
        AND (ra.driver_id = auth.uid() OR ra.rider_id = auth.uid())
    )
  );

CREATE POLICY "Anyone can view badges"
  ON public.ride_badges FOR SELECT USING (true);

CREATE INDEX idx_badges_receiver  ON public.ride_badges (receiver_id, badge_type);
CREATE INDEX idx_badges_agreement ON public.ride_badges (agreement_id);

CREATE OR REPLACE FUNCTION public.get_badge_counts(target_user_id UUID)
RETURNS TABLE (badge_type TEXT, count BIGINT)
LANGUAGE sql STABLE AS $$
  SELECT badge_type, COUNT(*) AS count
  FROM   public.ride_badges
  WHERE  receiver_id = target_user_id
  GROUP  BY badge_type
  ORDER  BY count DESC;
$$;

-- ── 6. No-show reports & strikes ─────────────────────────────────────────────

CREATE TABLE public.no_show_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.ride_agreements(id) ON DELETE CASCADE,
  reporter_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agreement_id, reporter_id)
);

ALTER TABLE public.no_show_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Party can report no-show on their agreement"
  ON public.no_show_reports FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id
    AND EXISTS (
      SELECT 1 FROM public.ride_agreements ra
      WHERE ra.id = agreement_id
        AND (ra.driver_id = auth.uid() OR ra.rider_id = auth.uid())
    )
  );

CREATE POLICY "Users can view their own reports"
  ON public.no_show_reports FOR SELECT
  USING (auth.uid() = reporter_id OR auth.uid() = reported_id);

CREATE INDEX idx_noshows_reported ON public.no_show_reports (reported_id);

CREATE OR REPLACE FUNCTION public.get_strike_level(target_user_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN COUNT(*) >= 7 THEN 3
    WHEN COUNT(*) >= 5 THEN 2
    WHEN COUNT(*) >= 3 THEN 1
    ELSE 0
  END
  FROM public.no_show_reports
  WHERE reported_id = target_user_id;
$$;
