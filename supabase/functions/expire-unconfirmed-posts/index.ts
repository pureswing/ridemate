// Every 15 minutes (cron, see supabase/migrations/057_expire_unconfirmed_posts_delete_and_notify.sql):
// finds active posts whose scheduled_at has passed with no confirmed
// (active/completed) ride_agreements, pushes the poster a heads-up (gated by
// notif_master, same as every other push feature), then hard-deletes those
// posts. Deleting cascades to conversations/messages about them — intended,
// not a bug: see the migration's header comment.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const KIND_TITLE: Record<string, string> = {
  ride: 'Your ride post expired',
  package: 'Your delivery post expired',
  hauling: 'Your hauling post expired',
};

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const nowIso = new Date().toISOString();

  const { data: candidates, error } = await supabase
    .from('ride_posts')
    .select('id, user_id, kind, origin_city, destination_city')
    .eq('status', 'active')
    .lt('scheduled_at', nowIso);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!candidates?.length) {
    return new Response(JSON.stringify({ deleted: 0 }), { status: 200 });
  }

  const { data: confirmed } = await supabase
    .from('ride_agreements')
    .select('post_id')
    .in('post_id', candidates.map((p) => p.id))
    .in('status', ['active', 'completed']);

  const confirmedIds = new Set((confirmed ?? []).map((a) => a.post_id));
  const toExpire = candidates.filter((p) => !confirmedIds.has(p.id));
  if (toExpire.length === 0) {
    return new Response(JSON.stringify({ deleted: 0 }), { status: 200 });
  }

  // Gather push tokens BEFORE deleting — nothing left to reference the post
  // by afterward.
  const ownerIds = Array.from(new Set(toExpire.map((p) => p.user_id)));
  const { data: owners } = await supabase
    .from('profiles')
    .select('id, push_tokens!inner(expo_push_token)')
    .in('id', ownerIds)
    .eq('notif_master', true);

  const tokensByOwner = new Map<string, string[]>();
  for (const o of (owners ?? []) as any[]) {
    tokensByOwner.set(o.id, o.push_tokens.map((t: any) => t.expo_push_token as string));
  }

  const messages = toExpire.flatMap((post) => {
    const tokens = tokensByOwner.get(post.user_id) ?? [];
    return tokens.map((to) => ({
      to,
      title: KIND_TITLE[post.kind] ?? 'Your post expired',
      body: `${post.origin_city} → ${post.destination_city} — no one booked it in time`,
      sound: 'default',
    }));
  });

  if (messages.length > 0) {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  }

  await supabase.from('ride_posts').delete().in('id', toExpire.map((p) => p.id));

  return new Response(JSON.stringify({ deleted: toExpire.length }), { status: 200 });
});
