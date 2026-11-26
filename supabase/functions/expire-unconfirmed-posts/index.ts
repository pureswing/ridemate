// Every 15 minutes (cron, see 057_expire_unconfirmed_posts_delete_and_notify.sql).
// Since 070_post_expiry_and_repost.sql this no longer deletes a post the
// moment it expires. Three passes:
//
//  1. EXPIRE — active posts whose scheduled_at passed with no confirmed
//     (active/completed) agreement → status 'expired', expired_at = now, and
//     the owner gets a "repost it within …" notification. The post then shows
//     in the app's Re-post screen; conversations about it are kept.
//  2. REMIND / DELETE — expired posts keep a grace window: 72 h for Free,
//     30 days for Donors (looked up now, so a lapsed Donor gets Free's
//     window). A reminder goes out once, 24 h (Free) / 3 days (Donor) before
//     the window closes; once it closes the post is hard-deleted
//     (conversations/messages cascade, as before 070).
//  3. NUDGE — once per publish, an active post with no conversations or
//     agreements (no offers of any kind) 24 h after it
//     went live and still 12 h+ before its date gets a "no offers yet" tip.
//     Never suggests a price (BoteGo doesn't set or recommend prices).
//
// Notifications are written to public.notifications (in-app center) and
// pushed to devices of owners with notif_master on.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const HOUR = 3_600_000;
const FREE_WINDOW = 72 * HOUR;
const DONOR_WINDOW = 30 * 24 * HOUR;
const FREE_REMINDER_BEFORE = 24 * HOUR;
const DONOR_REMINDER_BEFORE = 3 * 24 * HOUR;
const NUDGE_AFTER = 24 * HOUR;
const NUDGE_MIN_LEAD = 12 * HOUR;

const KIND_LABEL: Record<string, string> = { ride: 'ride', package: 'delivery', hauling: 'hauling' };

interface PostRow {
  id: string; user_id: string; kind: string; origin_city: string; destination_city: string;
  created_at?: string; reposted_at?: string | null; expired_at?: string | null; updated_at?: string;
  expiry_reminder_sent_at?: string | null; scheduled_at?: string;
}

interface Note { userId: string; type: string; title: string; body: string; data: Record<string, unknown> }

function route(p: PostRow): string {
  return p.destination_city && p.destination_city !== p.origin_city ? `${p.origin_city} → ${p.destination_city}` : p.origin_city;
}

async function donorIds(supabase: SupabaseClient, userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const { data } = await supabase.from('donor_status').select('user_id, is_donor').in('user_id', userIds);
  return new Set((data ?? []).filter((r: any) => r.is_donor).map((r: any) => r.user_id as string));
}

async function deliver(supabase: SupabaseClient, notes: Note[]) {
  if (notes.length === 0) return;
  await supabase.from('notifications').insert(notes.map((n) => ({ user_id: n.userId, type: n.type, title: n.title, body: n.body, data: n.data })));

  const ids = Array.from(new Set(notes.map((n) => n.userId)));
  const { data: owners } = await supabase
    .from('profiles')
    .select('id, push_tokens!inner(expo_push_token)')
    .in('id', ids)
    .eq('notif_master', true);
  const tokens = new Map<string, string[]>();
  for (const o of (owners ?? []) as any[]) tokens.set(o.id, o.push_tokens.map((t: any) => t.expo_push_token as string));

  const messages = notes.flatMap((n) => (tokens.get(n.userId) ?? []).map((to) => ({
    to, title: n.title, body: n.body, data: n.data, sound: 'default',
  })));
  for (let i = 0; i < messages.length; i += 100) {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const result = { expired: 0, reminded: 0, deleted: 0, nudged: 0 };

  // ── 1. Expire ────────────────────────────────────────────────────────────
  const { data: due, error } = await supabase
    .from('ride_posts')
    .select('id, user_id, kind, origin_city, destination_city')
    .eq('status', 'active')
    .lt('scheduled_at', nowIso);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  if (due?.length) {
    const { data: confirmed } = await supabase
      .from('ride_agreements')
      .select('post_id')
      .in('post_id', due.map((p) => p.id))
      .in('status', ['active', 'completed']);
    const confirmedIds = new Set((confirmed ?? []).map((a) => a.post_id));
    const toExpire = (due as PostRow[]).filter((p) => !confirmedIds.has(p.id));

    if (toExpire.length) {
      await supabase.from('ride_posts')
        .update({ status: 'expired', expired_at: nowIso })
        .in('id', toExpire.map((p) => p.id));
      const donors = await donorIds(supabase, toExpire.map((p) => p.user_id));
      await deliver(supabase, toExpire.map((p) => ({
        userId: p.user_id,
        type: 'post_expired',
        title: `Your ${KIND_LABEL[p.kind] ?? ''} post expired`.replace('  ', ' '),
        body: `${route(p)} — no one booked it in time. Re-post it with a new date within ${donors.has(p.user_id) ? '30 days' : '72 hours'} before it's deleted.`,
        data: { screen: 'repost', post_id: p.id },
      })));
      result.expired = toExpire.length;
    }
  }

  // ── 2. Remind / delete ───────────────────────────────────────────────────
  const { data: expired } = await supabase
    .from('ride_posts')
    .select('id, user_id, kind, origin_city, destination_city, expired_at, updated_at, expiry_reminder_sent_at')
    .eq('status', 'expired');
  if (expired?.length) {
    const donors = await donorIds(supabase, (expired as PostRow[]).map((p) => p.user_id));
    const toDelete: string[] = [];
    const toRemind: PostRow[] = [];
    for (const p of expired as PostRow[]) {
      const isDonor = donors.has(p.user_id);
      // Pre-070 expired rows have no expired_at — fall back to updated_at.
      const since = new Date(p.expired_at ?? p.updated_at ?? nowIso).getTime();
      const deadline = since + (isDonor ? DONOR_WINDOW : FREE_WINDOW);
      if (now >= deadline) toDelete.push(p.id);
      else if (!p.expiry_reminder_sent_at && now >= deadline - (isDonor ? DONOR_REMINDER_BEFORE : FREE_REMINDER_BEFORE)) toRemind.push(p);
    }
    if (toRemind.length) {
      await supabase.from('ride_posts').update({ expiry_reminder_sent_at: nowIso }).in('id', toRemind.map((p) => p.id));
      await deliver(supabase, toRemind.map((p) => ({
        userId: p.user_id,
        type: 'post_expiring',
        title: 'Your expired post will be deleted soon',
        body: `${route(p)} — re-post it with a new date before it's removed for good.`,
        data: { screen: 'repost', post_id: p.id },
      })));
      result.reminded = toRemind.length;
    }
    if (toDelete.length) {
      await supabase.from('ride_posts').delete().in('id', toDelete);
      result.deleted = toDelete.length;
    }
  }

  // ── 3. No-offers nudge ───────────────────────────────────────────────────
  const { data: live } = await supabase
    .from('ride_posts')
    .select('id, user_id, kind, origin_city, destination_city, created_at, reposted_at, scheduled_at')
    .eq('status', 'active')
    .is('no_offer_nudge_sent_at', null)
    .gt('scheduled_at', new Date(now + NUDGE_MIN_LEAD).toISOString());
  const aged = ((live ?? []) as PostRow[]).filter((p) => new Date(p.reposted_at ?? p.created_at!).getTime() <= now - NUDGE_AFTER);
  if (aged.length) {
    // In BoteGo an "offer" starts as a conversation (people message the
    // poster); a ride_agreements row only exists once an offer is accepted.
    // Either one means the post did get interest.
    const ids = aged.map((p) => p.id);
    const [{ data: convs }, { data: agreements }] = await Promise.all([
      supabase.from('conversations').select('post_id').in('post_id', ids),
      supabase.from('ride_agreements').select('post_id').in('post_id', ids),
    ]);
    const withOffers = new Set([...(convs ?? []), ...(agreements ?? [])].map((o) => o.post_id));
    const toNudge = aged.filter((p) => !withOffers.has(p.id));
    if (toNudge.length) {
      await supabase.from('ride_posts').update({ no_offer_nudge_sent_at: nowIso }).in('id', toNudge.map((p) => p.id));
      await deliver(supabase, toNudge.map((p) => ({
        userId: p.user_id,
        type: 'no_offers',
        title: 'No offers yet on your post',
        body: `${route(p)} — try adding more details or adjusting the time or your price to get more interest.`,
        data: { post_id: p.id, post_kind: p.kind },
      })));
      result.nudged = toNudge.length;
    }
  }

  return new Response(JSON.stringify(result), { status: 200 });
});
