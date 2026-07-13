import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// Supabase email links (confirm signup, password recovery) redirect to
// ridemate://verify#access_token=...&refresh_token=...&type=... — the tokens
// ride in the URL *fragment* (implicit grant), not the query string, so
// expo-linking's queryParams won't see them; parse the fragment by hand and
// hand the tokens to the SDK so `supabase.auth.getSession()` picks them up.
export async function applyAuthDeepLink(url: string): Promise<void> {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return;

  const params = new URLSearchParams(url.slice(hashIndex + 1));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return;

  // Flag BEFORE setSession — a recovery session is real, but the (auth) layout
  // must not treat it as "logged in" and bounce the user to (tabs).
  if (params.get('type') === 'recovery') {
    useAuthStore.getState().setIsPasswordRecovery(true);
  }
  await supabase.auth.setSession({ access_token, refresh_token });
}
