import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AppNotification } from '@/types';

export function useNotifications() {
  const [loading, setLoading] = useState(false);

  const getNotifications = useCallback(async (userId: string, limit = 50): Promise<AppNotification[]> => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as AppNotification[]) ?? [];
  }, []);

  const getUnreadCount = useCallback(async (userId: string): Promise<number> => {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    if (error) throw error;
    return count ?? 0;
  }, []);

  // Called once the notifications screen has fetched the list (so the UI
  // can still show which ones WERE unread during this view before they're
  // cleared) — marks everything read, same "open the bell, it clears" model
  // most apps use rather than per-row tap-to-read.
  const markAllRead = useCallback(async (userId: string): Promise<void> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getNotifications, getUnreadCount, markAllRead, loading };
}
