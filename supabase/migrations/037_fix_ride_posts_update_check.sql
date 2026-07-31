-- "Users can update their own posts" (created via the dashboard back in
-- 001_initial.sql's era) shows with_check: null in pg_policies — the same
-- ambiguous shape the dashboard-created ride_agreements INSERT policy had
-- (see 0XX's fix for that), which turned out to mean "explicitly broken,
-- deny everything" rather than "omitted, defaults to USING". Recreating it
-- via plain SQL with an explicit, unambiguous WITH CHECK clause.
DROP POLICY IF EXISTS "Users can update their own posts" ON public.ride_posts;

CREATE POLICY "Users can update their own posts"
  ON public.ride_posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
