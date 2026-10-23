// Permanently deletes the CALLER's own account — App Store guideline
// 5.1.1(v) requires real in-app deletion, not deactivation. Only ever acts
// on the user identified by the request's JWT; there is no target-user
// parameter, so nobody can delete someone else.
//
// Order matters: Storage files first (they don't cascade — every bucket
// keeps a user's files under `<userId>/`), then auth.admin.deleteUser,
// which cascades to profiles and every per-user table (see
// 069_account_deletion_fk.sql). Store subscriptions (Google Play / App
// Store) are billed by the store, not us — the app tells the user to
// cancel those separately.
//   supabase functions deploy delete-account
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const USER_BUCKETS = ['avatars', 'vehicle-photos', 'hauling-photos', 'route-maps'];

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
  const userId = userData.user.id;

  const service = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Storage cleanup is best-effort: a leftover file must never block the
  // account deletion itself, it's logged and the delete proceeds.
  const storageErrors: string[] = [];
  for (const bucket of USER_BUCKETS) {
    const { data: files, error: listError } = await service.storage.from(bucket).list(userId, { limit: 1000 });
    if (listError) { storageErrors.push(`${bucket}: ${listError.message}`); continue; }
    const paths = (files ?? []).map((f) => `${userId}/${f.name}`);
    if (paths.length === 0) continue;
    const { error: removeError } = await service.storage.from(bucket).remove(paths);
    if (removeError) storageErrors.push(`${bucket}: ${removeError.message}`);
  }
  if (storageErrors.length > 0) console.error(`delete-account ${userId} storage:`, storageErrors);

  const { error: deleteError } = await service.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error(`delete-account ${userId} auth:`, deleteError.message);
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ deleted: true }), { headers: { 'Content-Type': 'application/json' } });
});
