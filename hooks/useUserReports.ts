import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserReports() {
  const [loading, setLoading] = useState(false);

  const createReport = useCallback(async (
    reporterId: string,
    reportedId: string,
    reasons: string[],
    note?: string
  ): Promise<void> => {
    setLoading(true);
    try {
      const { error } = await supabase.from('user_reports').insert({
        reporter_id: reporterId,
        reported_id: reportedId,
        reasons,
        note: note?.trim() || undefined,
      });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createReport, loading };
}
