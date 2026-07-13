import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RideAgreement } from '@/types';

export function useRideHistory() {
  const [loading, setLoading] = useState(false);

  async function getCompletedRides(userId: string): Promise<RideAgreement[]> {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ride_agreements')
        .select(`
          *,
          post:ride_posts(origin_city, destination_city, scheduled_at, type, suggested_donation),
          driver:profiles!ride_agreements_driver_id_fkey(full_name),
          rider:profiles!ride_agreements_rider_id_fkey(full_name)
        `)
        .or(`driver_id.eq.${userId},rider_id.eq.${userId}`)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as RideAgreement[]) ?? [];
    } finally {
      setLoading(false);
    }
  }

  return { getCompletedRides, loading };
}
