import { IconName } from '@/constants/icons';
import { theme } from '@/constants/themes';
import { MembershipTier } from '@/types';

// Ported from ui_kits/ridemate-app/MembershipShared.jsx (TIER_META), trimmed
// to the donation-only model — labels come from i18n (t.subscription.free/donor)
// rather than living here, matching how the app already translates this copy.
export const TIER_ICON: Record<MembershipTier, IconName> = {
  free: 'person',
  donor: 'heart',
};

export const TIER_COLOR: Record<MembershipTier, { text: string; soft: string; border: string }> = {
  free: { text: theme.muted, soft: theme.surfaceAlt, border: theme.border },
  donor: { text: theme.donorText, soft: theme.donorSoft, border: theme.donorBorder },
};

// Quick-pick row on the Membership screen — a custom amount is also always
// offered alongside these. $20 (DONOR_SUGGESTED_AMOUNT) is the screen's
// default selection — the actual anchoring mechanism, not just a label.
export const DONOR_AMOUNTS = [10, 20, 50] as const;
export const DONOR_SUGGESTED_AMOUNT = 20;
// Custom-amount bounds: min matches the lowest preset (below this, card-
// processor fixed fees eat a disproportionate share); max guards against a
// fat-fingered amount (e.g. "$500" typed instead of "$50") turning into a
// real refund problem. Anything typed above DONOR_CONFIRM_THRESHOLD (the
// highest preset) gets an extra confirm step rather than submitting straight
// through, so a typo above the presets still gets one more look before it's
// charged.
export const DONOR_AMOUNT_MIN = 10;
export const DONOR_AMOUNT_MAX = 100;
export const DONOR_CONFIRM_THRESHOLD = 50;

// Feature-comparison table (Plan tab). Trimmed from the design's 10-row
// PLAN_FEATURES to only what's actually true today — see the plan doc for
// why "Ride history", "Dashboard stats", "Trusted drivers per city", and the
// AI report rows were dropped (none of those are gated anywhere in the app).
// `hasText` rows render their i18n free/paid strings instead of a check/x icon.
export interface PlanFeatureRow {
  key: 'postBrowse' | 'messaging' | 'savedAddresses' | 'earlyAccess';
  free: boolean;
  paid: boolean;
  hasText?: boolean;
}

export const PLAN_FEATURES: PlanFeatureRow[] = [
  { key: 'postBrowse', free: true, paid: true },
  { key: 'messaging', free: true, paid: true },
  { key: 'savedAddresses', free: true, paid: true, hasText: true },
  { key: 'earlyAccess', free: false, paid: true },
];
