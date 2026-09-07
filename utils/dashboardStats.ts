// Pure aggregation layer for the Dashboard (app/profile/dashboard.tsx).
// hooks/useDashboardStats.ts fetches the raw rows; everything here is a pure
// function of that data so it's easy to unit-test/reason about independently
// of Supabase. See the "Wire up Dashboard stats to real data" plan for the
// full data-source mapping.
import { RideAgreement, BadgeType, RidePostKind } from '@/types';
import { IRS_MILEAGE_RATE } from '@/constants/mileage';

// Rank targets are arbitrary UI goals, not derived backend concepts — safe
// to retune independently of the real progress numerators.
const RANK_THRESHOLDS = [0, 5, 20, 50]; // New / Active / Trusted / Elite
const SHORT_NOTICE_HOURS = 2;
const CANCEL_FLAG_THRESHOLD = 5;
// Estimated (not real) split of the mileage-rate cost, matching the ratio
// used by the original design fixture (~21% fuel / 79% wear).
const FUEL_SHARE = 0.2;

export interface DashboardAgreementPost {
  kind: RidePostKind;
  origin_city: string;
  destination_city: string;
  scheduled_at: string;
  suggested_donation?: number;
  distance_text?: string;
  duration_seconds?: number;
  price_mode?: 'firm' | 'open';
}

export interface DashboardAgreement {
  id: string;
  driver_id: string;
  rider_id: string;
  status: RideAgreement['status'];
  cancelled_by?: string;
  updated_at: string;
  post?: DashboardAgreementPost;
}

export interface ResolvedBid {
  won: boolean;
  createdAt: string;
}

export interface DashboardStatsInput {
  myId: string;
  agreements: DashboardAgreement[]; // status IN ('completed', 'cancelled') for me, either role
  badgeCounts: { badge_type: BadgeType; count: number }[];
  communityAvgCancelHours: number;
  resolvedBids: ResolvedBid[]; // oldest -> newest
  locale: string;
}

function parseMiles(distanceText?: string): number {
  const n = distanceText ? parseFloat(distanceText) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function byKind<T>(zero: T): Record<RidePostKind, T> {
  return { ride: zero, package: zero, hauling: zero } as Record<RidePostKind, T>;
}

export function buildDashboardStats(input: DashboardStatsInput) {
  const { myId, agreements, badgeCounts, communityAvgCancelHours, resolvedBids, locale } = input;

  const completed = agreements.filter((a) => a.status === 'completed' && a.post);
  const asDriver = completed.filter((a) => a.driver_id === myId);
  const asRider = completed.filter((a) => a.rider_id === myId);
  const cancelled = agreements.filter((a) => a.status === 'cancelled' && a.post);

  // ---- Overview ----
  const tripCounts = byKind(0);
  const timeSeconds = byKind(0);
  const earnedByKind = byKind(0);
  const milesByKind = byKind(0);
  for (const a of asDriver) {
    const kind = a.post!.kind;
    tripCounts[kind]++;
    timeSeconds[kind] += a.post!.duration_seconds ?? 0;
    earnedByKind[kind] += a.post!.suggested_donation ?? 0;
    milesByKind[kind] += parseMiles(a.post!.distance_text);
  }
  const riderFares = asRider.reduce((s, a) => s + (a.post!.suggested_donation ?? 0), 0);
  const tripsTotal = tripCounts.ride + tripCounts.package + tripCounts.hauling;
  const timeTotalSeconds = timeSeconds.ride + timeSeconds.package + timeSeconds.hauling;
  const earnedTotal = earnedByKind.ride + earnedByKind.package + earnedByKind.hauling;
  const milesTotal = milesByKind.ride + milesByKind.package + milesByKind.hauling;

  // Estimated driving cost (fuel+wear, IRS mileage rate) when I was the
  // driver — "Total spent" combines what I paid as a rider plus what my own
  // driving cost me, per the app's existing infoSpent copy.
  const drivingCostEstimate = Math.round(IRS_MILEAGE_RATE * milesTotal);
  const totalSpent = riderFares + drivingCostEstimate;

  // ---- Community ----
  const sortedBadges = [...badgeCounts].sort((a, b) => b.count - a.count);
  const totalBadges = badgeCounts.reduce((s, b) => s + b.count, 0);

  const rankTierIndex = RANK_THRESHOLDS.reduce((idx, threshold, i) => (tripsTotal >= threshold ? i : idx), 0);

  const byUser = cancelled.filter((a) => a.cancelled_by === myId);
  const onUser = cancelled.filter((a) => a.cancelled_by && a.cancelled_by !== myId);
  function noticeHours(a: DashboardAgreement): number {
    const scheduled = new Date(a.post!.scheduled_at).getTime();
    const cancelledAt = new Date(a.updated_at).getTime();
    return Math.max(0, (scheduled - cancelledAt) / (1000 * 60 * 60));
  }
  const byUserAvgNotice = byUser.length ? byUser.reduce((s, a) => s + noticeHours(a), 0) / byUser.length : 0;
  const onUserAvgNotice = onUser.length ? onUser.reduce((s, a) => s + noticeHours(a), 0) / onUser.length : 0;
  const cancelFlags = byUser.filter((a) => noticeHours(a) < SHORT_NOTICE_HOURS).length;

  // ---- Activity ----
  const monthKeys: string[] = [];
  const monthly: Record<string, { driver: number; passenger: number }> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthKeys.push(key);
    monthly[key] = { driver: 0, passenger: 0 };
  }
  const dowCount = [0, 0, 0, 0, 0, 0, 0];
  for (const a of completed) {
    if (!a.post?.scheduled_at) continue;
    const d = new Date(a.post.scheduled_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthly[key]) {
      if (a.driver_id === myId) monthly[key].driver++;
      else monthly[key].passenger++;
    }
    dowCount[d.getDay()]++;
  }
  const monthlyActivity = monthKeys.map((key) => {
    const [y, m] = key.split('-').map(Number);
    const label = new Date(y, m, 1).toLocaleDateString(locale, { month: 'short' });
    return { m: label, driver: monthly[key].driver, passenger: monthly[key].passenger };
  });

  const routeCounts = new Map<string, { origin: string; destination: string; count: number }>();
  for (const a of completed) {
    const k = `${a.post!.origin_city}→${a.post!.destination_city}`;
    const entry = routeCounts.get(k) ?? { origin: a.post!.origin_city, destination: a.post!.destination_city, count: 0 };
    entry.count++;
    routeCounts.set(k, entry);
  }
  const topRoutes = [...routeCounts.values()].sort((a, b) => b.count - a.count).slice(0, 3);

  const bidsWon = resolvedBids.filter((b) => b.won).length;
  const bidWinRate = resolvedBids.length ? Math.round((bidsWon / resolvedBids.length) * 100) : null;
  const bidHistory = resolvedBids.slice(-8).map((b) => b.won);

  // ---- Finance ----
  const earnings: { label: 'Rides' | 'Courier' | 'Hauling'; amount: number; kind: RidePostKind }[] = [
    { label: 'Rides', amount: earnedByKind.ride, kind: 'ride' },
    { label: 'Courier', amount: earnedByKind.package, kind: 'package' },
    { label: 'Hauling', amount: earnedByKind.hauling, kind: 'hauling' },
  ];

  const expenses = (['ride', 'package', 'hauling'] as RidePostKind[]).map((kind) => {
    const estimate = Math.round(IRS_MILEAGE_RATE * milesByKind[kind]);
    return {
      kind,
      fare: Math.round(earnedByKind[kind]),
      fuel: Math.round(estimate * FUEL_SHARE),
      wear: Math.round(estimate * (1 - FUEL_SHARE)),
    };
  });

  // ---- Fun facts ----
  const allTrips = [...asDriver, ...asRider];
  const longestTrip = allTrips.reduce<{ mi: number; route: string; date: string } | null>((best, a) => {
    const mi = parseMiles(a.post!.distance_text);
    if (mi <= 0) return best;
    if (!best || mi > best.mi) return { mi, route: `${a.post!.origin_city} → ${a.post!.destination_city}`, date: a.post!.scheduled_at };
    return best;
  }, null);
  const bestPaidTrip = asDriver.reduce<{ amount: number; route: string; date: string } | null>((best, a) => {
    const amount = a.post!.suggested_donation ?? 0;
    if (amount <= 0) return best;
    if (!best || amount > best.amount) return { amount, route: `${a.post!.origin_city} → ${a.post!.destination_city}`, date: a.post!.scheduled_at };
    return best;
  }, null);
  const longestRide = allTrips.reduce<{ minutes: number; route: string; date: string } | null>((best, a) => {
    const seconds = a.post!.duration_seconds ?? 0;
    if (seconds <= 0) return best;
    if (!best || seconds > best.minutes * 60) return { minutes: Math.round(seconds / 60), route: `${a.post!.origin_city} → ${a.post!.destination_city}`, date: a.post!.scheduled_at };
    return best;
  }, null);

  return {
    hasAnyActivity: completed.length > 0,
    overview: {
      trips: { total: tripsTotal, rides: tripCounts.ride, courier: tripCounts.package, hauling: tripCounts.hauling },
      time: { total: formatDuration(timeTotalSeconds), rides: formatDuration(timeSeconds.ride), courier: formatDuration(timeSeconds.package), hauling: formatDuration(timeSeconds.hauling) },
      earnedTotal, totalSpent,
    },
    community: {
      badges: sortedBadges, totalBadges, rankTierIndex,
      cancellation: {
        byUserCount: byUser.length, byUserAvgNotice, onUserCount: onUser.length, onUserAvgNotice,
        communityAvgNotice: communityAvgCancelHours, flags: cancelFlags, flagThreshold: CANCEL_FLAG_THRESHOLD,
      },
    },
    activity: {
      miles: { total: milesTotal, rides: milesByKind.ride, courier: milesByKind.package, hauling: milesByKind.hauling },
      monthlyActivity, dowCount, bidWinRate, bidHistory, topRoutes, routesCompletedTotal: completed.length,
    },
    finance: { earnings, earnedTotal, expenses },
    funFacts: { longestTrip, bestPaidTrip, longestRide },
    rpmTrips: asDriver.map((a) => ({
      kind: a.post!.kind, month: new Date(a.post!.scheduled_at).getMonth(), year: new Date(a.post!.scheduled_at).getFullYear(),
      amount: a.post!.suggested_donation ?? 0, miles: parseMiles(a.post!.distance_text),
    })),
  };
}

export type DashboardStats = ReturnType<typeof buildDashboardStats>;
