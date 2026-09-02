// Sends a real OS push notification when someone messages a user about a
// post THEY created — called by notify_new_message()'s trigger in
// supabase/migrations/054_post_message_push.sql via pg_net, only for the
// post-owner side of the conversation (see that migration's header comment).
// Push-only: never writes to public.notifications (that row is already
// inserted directly by the trigger, same as every other message).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface Payload {
  recipient_id: string;
  sender_name: string;
  body_preview: string;
  conversation_id: string;
}

Deno.serve(async (req) => {
  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: recipient, error } = await supabase
    .from('profiles')
    .select('push_tokens!inner(expo_push_token)')
    .eq('id', payload.recipient_id)
    .eq('notif_master', true)
    .eq('notif_post_messages', true)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const tokens = (recipient?.push_tokens ?? []).map((t: any) => t.expo_push_token as string);
  if (tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const messages = tokens.map((to) => ({
    to,
    title: `${payload.sender_name} sent you a message`,
    body: payload.body_preview,
    data: { conversation_id: payload.conversation_id },
    sound: 'default',
  }));

  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  return new Response(JSON.stringify({ sent: messages.length }), { status: 200 });
});
