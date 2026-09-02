// Sends a real OS push notification (via Expo's push service) to every user
// opted into a given post kind, when a new PUBLIC ride/package/hauling post
// is created. Called by the notify_new_post() trigger in
// supabase/migrations/053_push_tokens_and_new_post_push.sql via pg_net —
// never invoked directly by the client. Deliberately does NOT write to
// public.notifications: these are push-only, not shown in the app's own
// in-app Notification Center (see that migration's header comment for why).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100; // Expo's own recommended batch size per request

interface Payload {
  post_id: string;
  user_id: string; // poster — excluded from recipients
  kind: 'ride' | 'package' | 'hauling';
  origin_city: string;
  destination_city: string;
}

const KIND_TITLE: Record<Payload['kind'], string> = {
  ride: 'New ride posted',
  package: 'New delivery posted',
  hauling: 'New hauling job posted',
};

const KIND_PREF_COLUMN: Record<Payload['kind'], string> = {
  ride: 'notif_rides',
  package: 'notif_packages',
  hauling: 'notif_hauling',
};

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

  const prefColumn = KIND_PREF_COLUMN[payload.kind];
  if (!prefColumn) {
    return new Response(JSON.stringify({ error: `Unknown kind: ${payload.kind}` }), { status: 400 });
  }

  const { data: recipients, error } = await supabase
    .from('profiles')
    .select('push_tokens!inner(expo_push_token)')
    .neq('id', payload.user_id)
    .eq('notif_master', true)
    .eq(prefColumn, true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const tokens = (recipients ?? []).flatMap((r: any) => r.push_tokens.map((t: any) => t.expo_push_token as string));
  if (tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const title = KIND_TITLE[payload.kind];
  const body = `${payload.origin_city} → ${payload.destination_city}`;
  const data = { post_id: payload.post_id, post_kind: payload.kind };

  const messages = tokens.map((to) => ({ to, title, body, data, sound: 'default' }));

  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(chunk),
    });
  }

  return new Response(JSON.stringify({ sent: messages.length }), { status: 200 });
});
