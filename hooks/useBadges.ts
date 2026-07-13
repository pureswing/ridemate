import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { BadgeCount, BadgeType, StrikeLevel } from '@/types';

export function useBadges() {
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const getBadgeCounts = useCallback(async (userId: string): Promise<BadgeCount[]> => {
    const { data, error } = await supabase.rpc('get_badge_counts', { target_user_id: userId });
    if (error) throw error;
    return (data as BadgeCount[]) ?? [];
  }, []);

  const getStrikeLevel = useCallback(async (userId: string): Promise<StrikeLevel> => {
    const { data, error } = await supabase.rpc('get_strike_level', { target_user_id: userId });
    if (error) throw error;
    return (data as StrikeLevel) ?? 0;
  }, []);

  const hasGivenBadges = useCallback(async (agreementId: string): Promise<boolean> => {
    if (!session?.user) return false;
    const { count } = await supabase
      .from('ride_badges')
      .select('id', { count: 'exact', head: true })
      .eq('agreement_id', agreementId)
      .eq('giver_id', session.user.id);
    return (count ?? 0) > 0;
  }, [session]);

  const giveBadges = useCallback(async (
    agreementId: string,
    receiverId: string,
    badges: BadgeType[]
  ): Promise<void> => {
    if (!session?.user || badges.length === 0) return;
    setLoading(true);
    try {
      const rows = badges.map((badge_type) => ({
        agreement_id: agreementId,
        giver_id: session.user.id,
        receiver_id: receiverId,
        badge_type,
      }));
      const { error } = await supabase.from('ride_badges').insert(rows);
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, [session]);

  return { getBadgeCounts, getStrikeLevel, hasGivenBadges, giveBadges, loading };
}
