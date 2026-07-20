import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';

// Any signed-in user can read any other user's public profile — same
// public-readable RLS policy the feed already relies on for post authors.
export function usePublicProfile() {
  const getPublicProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return (data as Profile) ?? null;
  }, []);

  // ride_agreements' own RLS only lets the driver/rider read their rows
  // directly — this RPC (SECURITY DEFINER) exposes just the aggregate count
  // to any viewer. See supabase/migrations/025_public_trip_count.sql.
  const getCompletedTripCount = useCallback(async (userId: string): Promise<number> => {
    const { data, error } = await supabase.rpc('get_completed_trip_count', { target_user_id: userId });
    if (error) throw error;
    return (data as number) ?? 0;
  }, []);

  return { getPublicProfile, getCompletedTripCount };
}
