// Generic push sender for server-side triggers (see notify_new_message in
// 070_post_expiry_and_repost.sql). Body: { user_ids, title, body, data? }.
// Respects each recipient's notif_master switch, like every other push.
//
// Server-only: deployed WITH JWT verification (the default), so the gateway
// has already checked the token's signature; this then requires its role
// claim to be service_role (pg_net passes the service-role key from Vault).
// The anon key the app ships with ('anon') and user sessions
// ('authenticated') are rejected, so nobody can push arbitrary text to users.
//   supabase functions deploy send-user-push
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  let role: string | undefined;
  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    role = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))).role;
  } catch {}
  if (role !== 'service_role') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  let payload: { user_ids?: string[]; title?: string; body?: string; data?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }
  const userIds = (payload.user_ids ?? []).filter(Boolean);
  if (userIds.length === 0 || !payload.title) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  const { data: rows, error } = await supabase
    .from('profiles')
    .select('push_tokens!inner(expo_push_token)')
    .in('id', userIds)
    .eq('notif_master', true);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const messages = (rows ?? []).flatMap((r: any) => r.push_tokens.map((t: any) => ({
    to: t.expo_push_token as string,
    title: payload.title,
    body: payload.body ?? '',
    data: payload.data ?? {},
    sound: 'default',
  })));
  if (messages.length > 0) {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  }
  return new Response(JSON.stringify({ sent: messages.length }), { status: 200 });
});
