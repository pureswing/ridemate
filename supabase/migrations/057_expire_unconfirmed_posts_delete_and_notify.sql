-- Replaces 045's soft-expire-only cron. Per explicit user decision: once a
-- post's scheduled_at passes with no confirmed agreement, any conversation
-- about it is no longer relevant either — so instead of just flipping
-- status='expired' (which every feed/listing query already filtered out,
-- but left the row, and any conversations about it, sitting around forever),
-- this now pushes the poster a heads-up and then hard-DELETEs the post.
-- ride_posts.id cascades to conversations (017_messaging.sql) and messages,
-- so those go with it too — intended, not a bug: see the header comment on
-- app/messages/[id].tsx's staleReasonFor, which already degrades gracefully
-- (getConversationById returning null triggers the existing "couldn't load"
-- error sheet) for a conversation that's simply gone.
--
-- The per-row logic (push before delete, "does an agreement exist" check)
-- needs a real query, not a single UPDATE ... WHERE NOT EXISTS — moved into
-- the expire-unconfirmed-posts Edge Function instead of plpgsql.

SELECT cron.unschedule('expire-unconfirmed-posts-15min');

DROP FUNCTION IF EXISTS public.expire_unconfirmed_posts();

SELECT cron.schedule(
  'expire-unconfirmed-posts-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hcwuenikhlxlhkygnqzr.supabase.co/functions/v1/expire-unconfirmed-posts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
