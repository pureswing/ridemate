-- Root cause of the "new row violates row-level security policy for table
-- ride_posts" error on cancel/delete: Postgres also re-checks a table's
-- SELECT policy against the resulting row of an UPDATE, on top of the
-- UPDATE policy's own WITH CHECK. The SELECT policy below only allowed
-- status IN ('active','filled'), so setting status='cancelled' made the
-- row invisible to its own owner under that policy, and Postgres refused
-- the write outright — confirmed empirically by relaxing this policy in
-- an isolated, rolled-back transaction while leaving the UPDATE policy
-- (already correct, see 037) untouched.
--
-- Fix: owners can always see their own posts regardless of status (also
-- correct UX — an owner should be able to see their own cancelled/expired
-- posts, e.g. in ride history), non-owner visibility rules unchanged.
DROP POLICY IF EXISTS "Posts viewable by visibility rules" ON public.ride_posts;

CREATE POLICY "Posts viewable by visibility rules"
  ON public.ride_posts FOR SELECT
  USING (
    NOT is_blocked_pair(auth.uid(), user_id)
    AND (
      user_id = auth.uid()
      OR (
        status = 'active'
        AND (
          visibility = 'public'
          OR goes_public_at IS NULL
          OR now() >= goes_public_at
          OR EXISTS (
            SELECT 1 FROM user_favorites uf
            WHERE uf.driver_id = auth.uid() AND uf.rider_id = ride_posts.user_id
          )
        )
      )
      OR (
        status = 'filled'
        AND EXISTS (
          SELECT 1 FROM ride_agreements ra
          WHERE ra.post_id = ride_posts.id
            AND (ra.driver_id = auth.uid() OR ra.rider_id = auth.uid())
        )
      )
    )
  );
