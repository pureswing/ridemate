import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function useBlockedUsers() {
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const blockUser = useCallback(async (blockedId: string): Promise<void> => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({ blocker_id: session.user.id, blocked_id: blockedId });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, [session]);

  return { blockUser, loading };
}
