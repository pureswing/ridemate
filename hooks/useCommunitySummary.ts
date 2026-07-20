import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { BadgeCount } from '@/types';

// Minimum total badge count before attempting a summary — same "not enough
// data yet" gate as RouteStats.sample_size, so a person with 1-2 tags
// doesn't get an AI paragraph built from almost nothing.
export const MIN_FEEDBACK_FOR_SUMMARY = 5;

export function useCommunitySummary() {
  // Calls the summarize-feedback Edge Function — returns null (not a thrown
  // error) whenever there's nothing to show: not enough feedback yet, the
  // OPENAI_API_KEY secret isn't configured on the function, or the call
  // fails for any reason. The caller just omits the section in that case.
  const getCommunitySummary = useCallback(async (name: string, badges: BadgeCount[]): Promise<string | null> => {
    const total = badges.reduce((sum, b) => sum + b.count, 0);
    if (total < MIN_FEEDBACK_FOR_SUMMARY) return null;
    try {
      const { data, error } = await supabase.functions.invoke('summarize-feedback', {
        body: { name, badges },
      });
      if (error) return null;
      return data?.summary ?? null;
    } catch {
      return null;
    }
  }, []);

  return { getCommunitySummary };
}
