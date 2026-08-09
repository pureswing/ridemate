import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// subscriptions itself is locked to "view your own row only" (RLS), so
// there's no way to know whether ANOTHER user is a donor via a normal
// query — public.donor_status (see supabase/migrations/039_donor_status_view.sql)
// is a narrow view exposing just the one bit a badge needs, nothing else
// about anyone's billing.
export function useDonorStatus() {
  const getDonorStatuses = useCallback(async (userIds: string[]): Promise<Map<string, boolean>> => {
    const uniqueIds = [...new Set(userIds)];
    const result = new Map<string, boolean>();
    if (uniqueIds.length === 0) return result;

    const { data, error } = await supabase
      .from('donor_status')
      .select('user_id, is_donor')
      .in('user_id', uniqueIds);
    if (error || !data) return result;

    for (const row of data) result.set(row.user_id, row.is_donor);
    return result;
  }, []);

  return { getDonorStatuses };
}
