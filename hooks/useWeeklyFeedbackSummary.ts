import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// Reads the caller's own cached row from community_summary_cache — written
// weekly (Sundays) by the generate-weekly-feedback-summaries Edge Function,
// not generated live here. RLS-scoped, no service role needed client-side.
export function useWeeklyFeedbackSummary() {
  const { session } = useAuthStore();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const myId = session?.user?.id;

  useEffect(() => {
    let cancelled = false;
    if (!myId) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from('community_summary_cache')
      .select('summary')
      .eq('user_id', myId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) { setSummary(data?.summary ?? null); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [myId]);

  return { summary, loading };
}
