-- 038's SELECT policy only let a post's OWNER see it once status is
-- 'expired'/'cancelled' — the other party in a conversation about that post
-- got RLS-blocked, so the embedded post:ride_posts(...) join in
-- getConversationById/getConversations silently came back null for them.
-- That broke the messages/[id].tsx staleness check added right after this
-- (expired/cancelled → "post no longer available" modal): with post null,
-- postStatus was undefined and the check no-opped, letting them keep
-- sending messages into a dead conversation. Widen visibility to also cover
-- anyone who has (or had) a conversation about this post — mirrors the
-- existing 'filled' clause's shape, just keyed off conversations instead of
-- ride_agreements since a conversation can exist with no agreement at all.
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
      OR (
        status IN ('expired', 'cancelled')
        AND EXISTS (
          SELECT 1 FROM conversations c
          WHERE c.post_id = ride_posts.id
            AND (c.post_owner_id = auth.uid() OR c.requester_id = auth.uid())
        )
      )
    )
  );
