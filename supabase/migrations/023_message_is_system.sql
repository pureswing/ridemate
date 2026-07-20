-- Lets the app insert an automatic confirmation message into a chat thread
-- right after the post creator accepts an offer, without inventing a fake
-- "system" sender_id (messages.sender_id stays NOT NULL — the accepting
-- user, a real participant, is still the row's sender; is_system just tells
-- the UI to render it as a centered system pill instead of a chat bubble).
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;
