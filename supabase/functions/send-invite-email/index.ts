// Admin-only: seed a specific person with Donor access by email ahead of
// real payment (see admin-set-subscription's header comment for why). Sends
// the Android APK download link via Resend; the invites row created here is
// what handle_new_user (supabase/migrations/063_admin_invites.sql) checks on
// signup to grant Donor for donor_months instead of the default Free row.
// Requires secrets before deploying:
//   supabase secrets set RESEND_API_KEY=... APK_DOWNLOAD_URL=...
//   supabase functions deploy send-invite-email
// RESEND_API_KEY's account needs a verified sending domain — without one,
// Resend's sandbox only delivers to the email on the Resend account itself,
// not to real invitees.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const DONOR_MONTHS = 3;

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

  let email: string | undefined;
  try {
    const body = await req.json();
    email = body?.email?.trim().toLowerCase();
  } catch {}
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'A valid email is required' }), { status: 400 });
  }

  const { data: invite, error: insertError } = await service
    .from('invites')
    .insert({ email, invited_by: callerId, donor_months: DONOR_MONTHS })
    .select()
    .single();
  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const downloadUrl = Deno.env.get('APK_DOWNLOAD_URL');
  if (!resendKey || !downloadUrl) {
    await service.from('invites').update({ status: 'failed', error: 'RESEND_API_KEY or APK_DOWNLOAD_URL not configured' }).eq('id', invite.id);
    return new Response(JSON.stringify({ error: 'Email sending not configured', invite: { ...invite, status: 'failed' } }), { status: 500 });
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: Deno.env.get('RESEND_FROM') ?? 'BoteGo <onboarding@resend.dev>',
      to: [email],
      subject: "You're invited to BoteGo — 3 months of Donor included",
      html: `
        <p>You've been invited to try BoteGo.</p>
        <p><a href="${downloadUrl}">Download the app here</a>.</p>
        <p>Sign up with this same email address (${email}) and you'll automatically get ${DONOR_MONTHS} months of Donor access, on us.</p>
      `,
    }),
  });

  if (!emailRes.ok) {
    const errText = await emailRes.text();
    await service.from('invites').update({ status: 'failed', error: errText }).eq('id', invite.id);
    return new Response(JSON.stringify({ error: errText, invite: { ...invite, status: 'failed' } }), { status: 502 });
  }

  const { data: sentInvite } = await service
    .from('invites')
    .update({ status: 'sent' })
    .eq('id', invite.id)
    .select()
    .single();

  return new Response(JSON.stringify({ invite: sentInvite ?? invite }), { headers: { 'Content-Type': 'application/json' } });
});
