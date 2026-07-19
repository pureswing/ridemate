-- Lets a post owner decline an unconfirmed "offer" conversation on their
-- post — deletes the conversation (messages cascade with it, per
-- messages.conversation_id's ON DELETE CASCADE in 017_messaging.sql). The
-- same requester can still start a brand-new conversation afterward (a
-- fresh row, not a reopened one) since conversations.UNIQUE(post_id,
-- requester_id) no longer blocks it once the old row is gone.
CREATE POLICY "Post owner can decline (delete) a conversation"
  ON public.conversations FOR DELETE
  USING (auth.uid() = post_owner_id);
