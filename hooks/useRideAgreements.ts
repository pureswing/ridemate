import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { RideAgreement } from '@/types';

export function useRideAgreements() {
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const getAgreementsForPost = useCallback(async (postId: string): Promise<RideAgreement[]> => {
    const { data, error } = await supabase
      .from('ride_agreements')
      .select(`
        *,
        post:ride_posts(origin_city, destination_city, scheduled_at, type),
        driver:profiles!driver_id(full_name, avatar_url),
        rider:profiles!rider_id(full_name, avatar_url)
      `)
      .eq('post_id', postId);
    if (error) throw error;
    return (data as RideAgreement[]) ?? [];
  }, []);

  const getMyAgreements = useCallback(async (): Promise<RideAgreement[]> => {
    if (!session?.user) return [];
    const uid = session.user.id;
    const { data, error } = await supabase
      .from('ride_agreements')
      .select(`
        *,
        post:ride_posts(origin_city, destination_city, scheduled_at, type),
        driver:profiles!driver_id(full_name, avatar_url),
        rider:profiles!rider_id(full_name, avatar_url)
      `)
      .or(`driver_id.eq.${uid},rider_id.eq.${uid}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as RideAgreement[]) ?? [];
  }, [session]);

  const createAgreement = useCallback(async (postId: string, driverId: string): Promise<RideAgreement> => {
    if (!session?.user) throw new Error('Not authenticated');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ride_agreements')
        .insert({ post_id: postId, driver_id: driverId, rider_id: session.user.id })
        .select()
        .single();
      if (error) throw error;
      return data as RideAgreement;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const confirmCompletion = useCallback(async (agreementId: string, role: 'driver' | 'rider'): Promise<void> => {
    setLoading(true);
    try {
      const field = role === 'driver' ? 'driver_confirmed_at' : 'rider_confirmed_at';
      const { error } = await supabase
        .from('ride_agreements')
        .update({ [field]: new Date().toISOString() })
        .eq('id', agreementId);
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const reportNoShow = useCallback(async (agreementId: string, reportedId: string): Promise<void> => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('no_show_reports')
        .insert({ agreement_id: agreementId, reporter_id: session.user.id, reported_id: reportedId });
      if (error) throw error;
      await supabase
        .from('ride_agreements')
        .update({ status: 'no_show' })
        .eq('id', agreementId);
    } finally {
      setLoading(false);
    }
  }, [session]);

  return { getMyAgreements, getAgreementsForPost, createAgreement, confirmCompletion, reportNoShow, loading };
}
