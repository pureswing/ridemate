// Every 15 minutes (cron, see supabase/migrations/055_ride_reminders.sql),
// finds confirmed ride agreements starting in the next 2 hours that haven't
// been reminded yet, and pushes both the driver and rider (whichever has
// notif_reminders on) a heads-up. Push-only — never writes to
// public.notifications, same convention as 053/054's new-post/message pushes.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const nowIso = new Date().toISOString();
  const windowEndIso = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const { data: due, error } = await supabase
    .from('ride_agreements')
    .select('id, driver_id, rider_id, ride_posts!inner(id, kind, origin_city, destination_city, scheduled_at)')
    .eq('status', 'active')
    .eq('reminder_sent', false)
    .eq('ride_posts.kind', 'ride')
    .gt('ride_posts.scheduled_at', nowIso)
    .lte('ride_posts.scheduled_at', windowEndIso);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!due?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  let sent = 0;
  for (const agreement of due as any[]) {
    const post = agreement.ride_posts;
    const body = `${post.origin_city} → ${post.destination_city}`;

    const { data: recipients } = await supabase
      .from('profiles')
      .select('id, push_tokens!inner(expo_push_token)')
      .in('id', [agreement.driver_id, agreement.rider_id])
      .eq('notif_reminders', true);

    const tokens = (recipients ?? []).flatMap((r: any) => r.push_tokens.map((t: any) => t.expo_push_token as string));
    if (tokens.length > 0) {
      const messages = tokens.map((to) => ({
        to,
        title: 'Ride in 2 hours',
        body,
        data: { post_id: post.id, post_kind: 'ride' },
        sound: 'default',
      }));
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      sent += messages.length;
    }

    // Mark reminded regardless of whether a token existed — the 2-hour
    // window for this agreement has been evaluated; don't re-check it every
    // 15 minutes until the trip passes.
    await supabase.from('ride_agreements').update({ reminder_sent: true }).eq('id', agreement.id);
  }

  return new Response(JSON.stringify({ sent }), { status: 200 });
});
