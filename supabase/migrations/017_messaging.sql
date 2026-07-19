-- Real in-app messaging — replaces the external contact-method flow
-- (WhatsApp/phone/email) entirely. A conversation is created once a
-- requester reaches out about a specific post; contact_reveals /
-- ride_posts.contact_method stay in the schema (still NOT NULL) but every
-- new post now writes contact_method='in_app' and coordination happens
-- here instead of an external app.
CREATE TABLE public.conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id          UUID NOT NULL REFERENCES public.ride_posts(id) ON DELETE CASCADE,
  post_owner_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, requester_id)
);

CREATE TABLE public.messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at          TIMESTAMPTZ
);

CREATE INDEX idx_conversations_post_owner ON public.conversations(post_owner_id);
CREATE INDEX idx_conversations_requester  ON public.conversations(requester_id);
CREATE INDEX idx_conversations_post       ON public.conversations(post_id);
CREATE INDEX idx_messages_conversation    ON public.messages(conversation_id, created_at);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = post_owner_id OR auth.uid() = requester_id);

CREATE POLICY "Requester can start a conversation"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Participants can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.post_owner_id = auth.uid() OR c.requester_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.post_owner_id = auth.uid() OR c.requester_id = auth.uid())
    )
  );

CREATE POLICY "Participants can mark messages as read"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.post_owner_id = auth.uid() OR c.requester_id = auth.uid())
    )
  );

-- Bumps last_message_at so the conversation list can sort by recency
-- without a second round-trip from the client on every send.
CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_touch_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_conversation_on_message();
