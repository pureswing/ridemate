-- New Settings toggle: notify a post's creator via OS push (system tray only,
-- same push-only pattern as 053_push_tokens_and_new_post_push.sql — never
-- shown in the in-app Notification Center) when someone messages them on a
-- post they created. Scoped deliberately to the post OWNER side only: if a
-- requester messages a post owner, the owner can get a push; the reverse
-- (owner replies to requester) does NOT push, since that's not "a message on
-- a post I created" from the requester's point of view. The existing in-app
-- 'message' notification (026_notifications.sql) already covers both
-- directions and is untouched by this migration.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_post_messages BOOLEAN NOT NULL DEFAULT TRUE;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  conv RECORD;
  recipient UUID;
  sender_name TEXT;
BEGIN
  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;
  recipient := CASE WHEN conv.post_owner_id = NEW.sender_id THEN conv.requester_id ELSE conv.post_owner_id END;
  SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    recipient,
    'message',
    COALESCE(sender_name, 'Someone') || ' sent you a message',
    LEFT(NEW.body, 120),
    jsonb_build_object('conversation_id', NEW.conversation_id)
  );

  -- Push only when the recipient is the post's creator (i.e. a requester
  -- messaged them about their own post) — see header comment.
  IF recipient = conv.post_owner_id THEN
    PERFORM net.http_post(
      url := 'https://hcwuenikhlxlhkygnqzr.supabase.co/functions/v1/send-message-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := jsonb_build_object(
        'recipient_id', recipient,
        'sender_name', COALESCE(sender_name, 'Someone'),
        'body_preview', LEFT(NEW.body, 120),
        'conversation_id', NEW.conversation_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
