import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RidePostInsight } from '@/types';

export function useRouteIntelligence() {
  const getInsight = useCallback(async (postId: string): Promise<RidePostInsight | null> => {
    const { data, error } = await supabase
      .from('ride_post_insights')
      .select('*')
      .eq('post_id', postId)
      .maybeSingle();
    if (error || !data) return null;
    return data as RidePostInsight;
  }, []);

  return { getInsight };
}
