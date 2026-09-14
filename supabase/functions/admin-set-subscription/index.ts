// Lets the single admin account (see supabase/migrations/063_admin_invites.sql)
// flip its own subscription between Donor and Free with no expiration —
// a stand-in for real payment (RevenueCat/IAP is blocked until the app is at
// least in TestFlight/Play Console Internal Testing). Self only: the caller's
// own subscription row, resolved from their JWT, never a passed-in target —
// there is no "grant to any user" surface here.
// Unlike the cron-only functions (generate-post-insight, etc.), this one is
// invoked directly by the client and gates a paid-feature flag, so it must
// verify the caller server-side rather than trusting anything from the
// request body:
//   supabase functions deploy admin-set-subscription
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
  }

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userError } = await anonClient.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
  }
  const callerId = userData.user.id;

  const service = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: callerProfile, error: profileError } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', callerId)
    .single();
  if (profileError || !callerProfile?.is_admin) {
    return new Response(JSON.stringify({ error: 'Not an admin' }), { status: 403 });
  }

  let plan: 'donor' | 'free' | undefined;
  try {
    const body = await req.json();
    plan = body?.plan;
  } catch {}
  if (plan !== 'donor' && plan !== 'free') {
    return new Response(JSON.stringify({ error: "plan must be 'donor' or 'free'" }), { status: 400 });
  }

  const now = new Date().toISOString();
  const patch = plan === 'donor'
    ? { status: 'active', plan: 'donor', period_start: now, period_end: null }
    : { status: 'free', plan: null, period_start: null, period_end: null };

  const { data: updated, error: updateError } = await service
    .from('subscriptions')
    .update(patch)
    .eq('user_id', callerId)
    .select()
    .single();
  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ subscription: updated }), { headers: { 'Content-Type': 'application/json' } });
});
