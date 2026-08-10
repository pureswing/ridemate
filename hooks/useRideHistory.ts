import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';
import { RideAgreement, VehicleProfile, BadgeType } from '@/types';

export type RideHistoryTypeFilter = 'all' | 'driver' | 'rider' | 'package' | 'hauling';
export type RideHistoryPeriodFilter = 'all' | 'week' | 'month';

const PAGE_SIZE = 20;

function startOfWeek(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - s.getDay());
  return s;
}

function matchesPeriod(scheduledAt: string, filter: RideHistoryPeriodFilter): boolean {
  if (filter === 'all') return true;
  const d = new Date(scheduledAt);
  const now = new Date();
  if (filter === 'week') return d >= startOfWeek(now);
  return d >= new Date(now.getFullYear(), now.getMonth(), 1);
}

function matchesType(a: RideAgreement, userId: string, filter: RideHistoryTypeFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'package') return a.post?.kind === 'package';
  if (filter === 'hauling') return a.post?.kind === 'hauling';
  // 'driver' / 'rider' are scoped to kind:'ride' — a completed package/hauling
  // job isn't "a ride I drove", it just has a driver_id/rider_id column
  // because ride_agreements is shared across all three kinds.
  if (a.post?.kind !== 'ride') return false;
  return filter === 'driver' ? a.driver_id === userId : a.rider_id === userId;
}

// Username (never legal full_name — per the request, searching should not
// leak/match on someone's real name), addresses, or a month/year typed as
// text ("July", "Jul", "2026"). All OR'd — any match is enough.
function matchesSearch(a: RideAgreement, userId: string, query: string, locale: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const otherUsername = (a.driver_id === userId ? a.rider?.username : a.driver?.username)?.toLowerCase();
  if (otherUsername && otherUsername.includes(q)) return true;

  const originAddr = a.post?.origin_address?.toLowerCase();
  const destAddr = a.post?.destination_address?.toLowerCase();
  if (originAddr?.includes(q) || destAddr?.includes(q)) return true;

  if (a.post?.scheduled_at) {
    const d = new Date(a.post.scheduled_at);
    const monthLong = d.toLocaleDateString(locale, { month: 'long' }).toLowerCase();
    const monthShort = d.toLocaleDateString(locale, { month: 'short' }).toLowerCase();
    const year = String(d.getFullYear());
    if (monthLong.includes(q) || monthShort.includes(q) || year.includes(q)) return true;
  }

  return false;
}

export function useRideHistory() {
  const [loading, setLoading] = useState(false);
  const t = useTranslation();
  // Raw fetch cached per user — typing in the search box or flipping a
  // filter chip re-filters this in memory instead of re-querying Supabase
  // on every keystroke. Only a real re-open of the screen (or explicit
  // force) re-fetches.
  const rawCache = useRef<{ userId: string; rows: RideAgreement[] } | null>(null);

  const fetchRaw = useCallback(async (userId: string, force = false): Promise<RideAgreement[]> => {
    if (!force && rawCache.current?.userId === userId) return rawCache.current.rows;
    const { data, error } = await supabase
      .from('ride_agreements')
      .select(`
        *,
        post:ride_posts(origin_city, destination_city, origin_address, destination_address, scheduled_at, type, kind, suggested_donation, distance_text, duration_text, details),
        driver:profiles!ride_agreements_driver_id_fkey(full_name, avatar_url, username),
        rider:profiles!ride_agreements_rider_id_fkey(full_name, avatar_url, username)
      `)
      .or(`driver_id.eq.${userId},rider_id.eq.${userId}`)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    const rows = (data as RideAgreement[]) ?? [];
    rawCache.current = { userId, rows };
    return rows;
  }, []);

  // Fetches every completed agreement for the user once (cached — see
  // fetchRaw), then filters/pages in JS — matches this app's existing
  // convention (messages.tsx's bucketOf, CompletionGate) rather than
  // fighting PostgREST's nested-filter syntax for a data volume (one user's
  // ride history) small enough it doesn't matter.
  const getCompletedRides = useCallback(async (
    userId: string,
    options?: {
      typeFilter?: RideHistoryTypeFilter; periodFilter?: RideHistoryPeriodFilter;
      search?: string; offset?: number; limit?: number; forceRefresh?: boolean;
    }
  ): Promise<{ items: RideAgreement[]; hasMore: boolean; totalFiltered: number }> => {
    setLoading(true);
    try {
      const all = await fetchRaw(userId, options?.forceRefresh);

      const typeFilter = options?.typeFilter ?? 'all';
      const periodFilter = options?.periodFilter ?? 'all';
      const search = options?.search ?? '';
      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? PAGE_SIZE;

      const filtered = all.filter((a) =>
        matchesType(a, userId, typeFilter)
        && (!a.post?.scheduled_at || matchesPeriod(a.post.scheduled_at, periodFilter))
        && matchesSearch(a, userId, search, t.locale)
      );
      const page = filtered.slice(offset, offset + limit);
      return { items: page, hasMore: offset + limit < filtered.length, totalFiltered: filtered.length };
    } finally {
      setLoading(false);
    }
  }, [t.locale, fetchRaw]);

  // Batched per screen-load, not per-card — the driver's vehicle (by
  // driver_id) and the badges the CURRENT user received (by agreement_id),
  // for the "ride record" detail's vehicle/badges sections.
  const getVehiclesForDrivers = useCallback(async (driverIds: string[]): Promise<Record<string, VehicleProfile>> => {
    if (driverIds.length === 0) return {};
    const { data, error } = await supabase
      .from('vehicle_profiles')
      .select('*')
      .in('user_id', Array.from(new Set(driverIds)));
    if (error) throw error;
    const map: Record<string, VehicleProfile> = {};
    for (const v of (data as (VehicleProfile & { user_id: string })[]) ?? []) {
      // A user can have vehicle profiles for more than one kind (rides vs
      // hauling) — first match wins, good enough for a trip summary.
      if (!map[v.user_id]) map[v.user_id] = v;
    }
    return map;
  }, []);

  const getBadgesReceived = useCallback(async (agreementIds: string[], userId: string): Promise<Record<string, BadgeType[]>> => {
    if (agreementIds.length === 0) return {};
    const { data, error } = await supabase
      .from('ride_badges')
      .select('agreement_id, badge_type')
      .in('agreement_id', Array.from(new Set(agreementIds)))
      .eq('receiver_id', userId);
    if (error) throw error;
    const map: Record<string, BadgeType[]> = {};
    for (const row of (data as { agreement_id: string; badge_type: BadgeType }[]) ?? []) {
      (map[row.agreement_id] ??= []).push(row.badge_type);
    }
    return map;
  }, []);

  return { getCompletedRides, getVehiclesForDrivers, getBadgesReceived, loading };
}
