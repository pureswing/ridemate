-- Lets a user block another after a completed job (JobCompletionReview's
-- "Block user" toggle, shown alongside the "Other" badge option) —
-- "Neither of you will see each other in RideMate again": the blocked
-- party's posts disappear from the feed/detail for the blocker (and vice
-- versa, since the check is symmetric), and conversations between the two
-- become unreachable — both existing threads and starting new ones.
-- Asymmetric read: only the blocker can see their own block rows, so a
-- blocked user has no way to tell they were blocked (matches typical
-- blocking UX — RLS simply grants no SELECT policy for blocked_id).
CREATE TABLE public.blocked_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can block others"
  ON public.blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can view their own blocks"
  ON public.blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock"
  ON public.blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);

CREATE INDEX idx_blocked_users_blocker ON public.blocked_users (blocker_id);
CREATE INDEX idx_blocked_users_blocked ON public.blocked_users (blocked_id);

-- Small helper — symmetric block check, reused by every policy below so
-- the direction (who blocked whom) never has to be duplicated per policy.
CREATE OR REPLACE FUNCTION public.is_blocked_pair(user_a UUID, user_b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = user_a AND blocked_id = user_b)
       OR (blocker_id = user_b AND blocked_id = user_a)
  );
$$;

-- ── ride_posts: extend 033's visibility policy with a block exclusion ──────
DROP POLICY IF EXISTS "Posts viewable by visibility rules" ON public.ride_posts;

CREATE POLICY "Posts viewable by visibility rules"
  ON public.ride_posts FOR SELECT
  USING (
    NOT public.is_blocked_pair(auth.uid(), user_id)
    AND (
      (
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
      )
      OR (
        status = 'filled'
        AND (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.ride_agreements ra
            WHERE ra.post_id = ride_posts.id
              AND (ra.driver_id = auth.uid() OR ra.rider_id = auth.uid())
          )
        )
      )
    )
  );

-- ── conversations: block cuts off both new threads and existing ones ──────
DROP POLICY IF EXISTS "Participants can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Requester can start a conversation" ON public.conversations;

CREATE POLICY "Participants can view their unblocked conversations"
  ON public.conversations FOR SELECT
  USING (
    (auth.uid() = post_owner_id OR auth.uid() = requester_id)
    AND NOT public.is_blocked_pair(post_owner_id, requester_id)
  );

CREATE POLICY "Requester can start a conversation if not blocked"
  ON public.conversations FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id
    AND NOT public.is_blocked_pair(post_owner_id, requester_id)
  );
