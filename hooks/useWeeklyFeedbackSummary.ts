import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';

// Reads the caller's own cached row from community_summary_cache — written
// weekly (Sundays) by the generate-weekly-feedback-summaries Edge Function,
// not generated live here. RLS-scoped, no service role needed client-side.
export function useWeeklyFeedbackSummary() {
  const { session } = useAuthStore();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const language = useLanguageStore((s) => s.language);
  const myId = session?.user?.id;

  useEffect(() => {
    let cancelled = false;
    if (!myId) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from('community_summary_cache')
      .select('summary, summary_es')
      .eq('user_id', myId)
      .maybeSingle()
      .then(({ data }) => {
        // summary_es is null on rows generated before 067_ai_text_spanish.sql.
        const text = (language === 'es' && data?.summary_es) || data?.summary;
        if (!cancelled) { setSummary(text ?? null); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [myId, language]);

  return { summary, loading };
}
