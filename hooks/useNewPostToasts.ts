import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { usePostToastStore } from '@/store/postToastStore';

// Light polling, not a Supabase Realtime channel — matches this app's
// established convention (see app/(tabs)/_layout.tsx's messages-badge poll
// and app/messages/[id].tsx's comment): no realtime infra exists here, and a
// few seconds of latency is unnoticeable for a toast. Mounted once at the
// root layout so it keeps running across every screen, tab or stacked.
const POLL_MS = 6000;

export function useNewPostToasts(userId: string | undefined) {
  const cursorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    // Only toast posts created AFTER the app opened — never backfill a feed
    // of everything posted while the user was away.
    cursorRef.current = new Date().toISOString();

    let cancelled = false;
    async function poll() {
      const { data, error } = await supabase
        .from('ride_posts')
        .select('id, kind, created_at')
        .gt('created_at', cursorRef.current!)
        .eq('status', 'active')
        .eq('visibility', 'public')
        .neq('user_id', userId)
        .order('created_at', { ascending: true });
      if (cancelled || error || !data?.length) return;

      cursorRef.current = data[data.length - 1].created_at;
      for (const post of data) {
        usePostToastStore.getState().pushToast({ id: post.id, kind: post.kind as any });
      }
    }

    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [userId]);
}
