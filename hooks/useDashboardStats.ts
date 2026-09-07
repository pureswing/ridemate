import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import { buildDashboardStats, DashboardStats, DashboardAgreement, ResolvedBid } from '@/utils/dashboardStats';
import { BadgeType } from '@/types';

const POST_FIELDS = 'kind, origin_city, destination_city, scheduled_at, suggested_donation, distance_text, duration_seconds, price_mode';

export function useDashboardStats() {
  const { session } = useAuthStore();
  const t = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const myId = session?.user?.id;

  const load = useCallback(async () => {
    if (!myId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Sequential, not Promise.all: on-device testing showed a subsequent
      // parallel request can hang indefinitely after an earlier one in the
      // same batch errors (e.g. a column pending a migration) — firing one
      // at a time and failing fast on the first error avoids that stuck
      // state, at the small cost of a few extra round trips.
      const agreementsRes = await supabase
        .from('ride_agreements')
        .select(`id, driver_id, rider_id, status, cancelled_by, updated_at, post:ride_posts(${POST_FIELDS})`)
        .or(`driver_id.eq.${myId},rider_id.eq.${myId}`)
        .in('status', ['completed', 'cancelled']);
      if (agreementsRes.error) throw agreementsRes.error;

      const wonPostsRes = await supabase
        .from('ride_agreements')
        .select('post_id')
        .or(`driver_id.eq.${myId},rider_id.eq.${myId}`);
      if (wonPostsRes.error) throw wonPostsRes.error;

      const badgesRes = await supabase.rpc('get_badge_counts', { target_user_id: myId });
      if (badgesRes.error) throw badgesRes.error;

      const communityAvgRes = await supabase.rpc('get_cancellation_community_avg');
      if (communityAvgRes.error) throw communityAvgRes.error;

      const bidPostsRes = await supabase
        .from('conversations')
        .select('post_id, created_at, post:ride_posts(price_mode, status)')
        .eq('requester_id', myId);
      if (bidPostsRes.error) throw bidPostsRes.error;

      const wonPostIds = new Set((wonPostsRes.data as { post_id: string }[]).map((r) => r.post_id));
      const resolvedBids: ResolvedBid[] = (bidPostsRes.data as unknown as { post_id: string; created_at: string; post: { price_mode?: string; status: string } | null }[])
        .filter((c) => c.post?.price_mode === 'open' && c.post.status !== 'active')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((c) => ({ won: wonPostIds.has(c.post_id), createdAt: c.created_at }));

      const built = buildDashboardStats({
        myId,
        agreements: (agreementsRes.data as unknown as DashboardAgreement[]) ?? [],
        badgeCounts: (badgesRes.data as { badge_type: BadgeType; count: number }[]) ?? [],
        communityAvgCancelHours: (communityAvgRes.data as number) ?? 0,
        resolvedBids,
        locale: t.locale,
      });
      setStats(built);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, [myId, t.locale]);

  useEffect(() => { load(); }, [load]);

  return { stats, loading, error, reload: load };
}
