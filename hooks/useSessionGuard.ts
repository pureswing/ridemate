import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// Single-session-per-user enforcement — see supabase/migrations/065_single_session.sql
// and hooks/useAuth.ts's signIn(). Listens for this user's profiles row
// changing active_session_id to something other than what THIS device
// claimed (fresh login here, or adopted at cold start) — meaning another
// device just logged in — and signs this device out immediately, rather
// than leaving it silently working until its cached access token expires.
export function useSessionGuard(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`session-guard-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const newSessionId = (payload.new as { active_session_id?: string | null }).active_session_id;
          const { mySessionId, clear, setLoggedOutElsewhere } = useAuthStore.getState();
          if (!mySessionId || !newSessionId || newSessionId === mySessionId) return;
          supabase.auth.signOut().finally(() => {
            clear();
            setLoggedOutElsewhere(true);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
