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
        post:ride_posts(origin_city, destination_city, scheduled_at, type, kind, suggested_donation, duration_seconds),
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
        post:ride_posts(origin_city, destination_city, scheduled_at, type, kind, suggested_donation, duration_seconds),
        driver:profiles!driver_id(full_name, avatar_url),
        rider:profiles!rider_id(full_name, avatar_url)
      `)
      .or(`driver_id.eq.${uid},rider_id.eq.${uid}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as RideAgreement[]) ?? [];
  }, [session]);

  // Agreements I haven't confirmed my side of, whose job's estimated end
  // time (scheduled_at + duration_seconds) is 2+ hours in the past — the
  // trigger for CompletionGate's app-open auto-prompt. Filtered client-side
  // off getMyAgreements rather than a dedicated RPC, matching this app's
  // existing convention (e.g. messages.tsx's bucketOf) of fetching then
  // bucketing in JS instead of adding narrow single-purpose queries.
  const getPendingCompletions = useCallback(async (): Promise<RideAgreement[]> => {
    if (!session?.user) return [];
    const uid = session.user.id;
    const all = await getMyAgreements();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const now = Date.now();
    return all.filter((a) => {
      if (a.status !== 'pending' && a.status !== 'active') return false;
      const myConfirmedAt = a.driver_id === uid ? a.driver_confirmed_at : a.rider_confirmed_at;
      if (myConfirmedAt) return false;
      if (!a.post?.scheduled_at) return false;
      const endTime = new Date(a.post.scheduled_at).getTime() + (a.post.duration_seconds ?? 0) * 1000;
      return now - endTime >= twoHoursMs;
    });
  }, [session, getMyAgreements]);

  // riderId is explicit (not assumed to be the caller) because whoever
  // confirms the agreement isn't always the rider — e.g. on a pooling
  // 'offer' post, the post owner (the driver) is the one who accepts a
  // rider's request, not the other way around. See messages/[id].tsx's
  // confirmAccept for how riderId is derived from the conversation.
  const createAgreement = useCallback(async (postId: string, driverId: string, riderId: string): Promise<RideAgreement> => {
    if (!session?.user) throw new Error('Not authenticated');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ride_agreements')
        .insert({ post_id: postId, driver_id: driverId, rider_id: riderId })
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

  // The driver backing out of a confirmed job — see
  // supabase/migrations/033_post_privacy_on_agreement.sql's trigger, which
  // automatically flips the post back to 'active' (public) the moment this
  // status change lands.
  const cancelAgreement = useCallback(async (agreementId: string): Promise<void> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('ride_agreements')
        .update({ status: 'cancelled' })
        .eq('id', agreementId);
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getMyAgreements, getAgreementsForPost, getPendingCompletions, createAgreement, confirmCompletion, reportNoShow, cancelAgreement, loading };
}
