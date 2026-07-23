-- 020_conversation_decline.sql only let the post OWNER decline (delete) an
-- unconfirmed conversation. But the "accept/decline" review card in the
-- chat thread (app/messages/[id].tsx VehiclePeekCard) is shown to whichever
-- party is NOT the prospective driver — for an 'offer' post (owner offers to
-- drive) that's the REQUESTER, not the owner. Declining as the requester was
-- silently no-op-ing: RLS blocked the DELETE, Supabase returned no error
-- (0 rows matched, not a permission error), so the app happily navigated
-- back while the conversation row was still there — it kept showing in the
-- inbox as an active thread.
DROP POLICY IF EXISTS "Post owner can decline (delete) a conversation" ON public.conversations;

CREATE POLICY "Either party can decline (delete) an unconfirmed conversation"
  ON public.conversations FOR DELETE
  USING (auth.uid() = post_owner_id OR auth.uid() = requester_id);
