import { IconName } from '@/constants/icons';
import { MembershipTier } from '@/types';

// Ported from ui_kits/ridemate-app/MembershipShared.jsx (TIER_META), trimmed
// to the donation-only model — labels come from i18n (t.subscription.free/donor)
// rather than living here, matching how the app already translates this copy.
export const TIER_ICON: Record<MembershipTier, IconName> = {
  free: 'person',
  donor: 'heart_handshake',
};

// Quick-pick row on the Membership screen. Fixed amounts only — real store
// subscriptions (Google Play Billing via RevenueCat) can't charge an
// arbitrary user-typed price, only whichever of these exact products the
// user picks. $20 (DONOR_SUGGESTED_AMOUNT) is the screen's default
// selection — the actual anchoring mechanism, not just a label.
export const DONOR_AMOUNTS = [10, 20, 50] as const;
export const DONOR_SUGGESTED_AMOUNT = 20;
// RevenueCat package/product identifiers (Test Store today, real Google
// Play products once the app has store presence — same ids either way, see
// hooks/usePurchases.ts) — one auto-renewing monthly subscription per DONOR_AMOUNTS entry.
export const DONOR_PACKAGE_ID: Record<(typeof DONOR_AMOUNTS)[number], string> = {
  10: 'donor_monthly_10',
  20: 'donor_monthly_20',
  50: 'donor_monthly_50',
};

// Feature-comparison table (Plan tab). Trimmed from the design's 10-row
// PLAN_FEATURES to only what's actually true today — see the plan doc for
// why "Ride history", "Dashboard stats", "Trusted drivers per city", and the
// AI report rows were dropped (none of those are gated anywhere in the app).
// `hasText` rows render their i18n free/paid strings instead of a check/x icon.
export interface PlanFeatureRow {
  key: 'postBrowse' | 'messaging' | 'savedAddresses' | 'earlyAccess' | 'routeIntel' | 'communityFeedback' | 'dashboardInsights';
  free: boolean;
  paid: boolean;
  hasText?: boolean;
}

export const PLAN_FEATURES: PlanFeatureRow[] = [
  { key: 'postBrowse', free: true, paid: true },
  { key: 'messaging', free: true, paid: true },
  { key: 'savedAddresses', free: true, paid: true, hasText: true },
  { key: 'earlyAccess', free: false, paid: true },
  // RouteIntelligenceCard (ride/package/hauling detail screens) is gated
  // on isDonor — see supabase/migrations/042_route_intelligence.sql.
  { key: 'routeIntel', free: false, paid: true },
  // AI weekly community-feedback summary (app/user/[id].tsx) — gated on the
  // VIEWER's own isDonor, see useCommunitySummary.ts's caller.
  { key: 'communityFeedback', free: false, paid: true },
  // Dashboard's Activity/Finance/"Did you know?" sections (app/profile/
  // dashboard.tsx's PAID_SECTIONS) — mock data today, but already gated on
  // isDonor same as everything else here.
  { key: 'dashboardInsights', free: false, paid: true },
];
