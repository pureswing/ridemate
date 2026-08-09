// Reference-rate calculation for the feed's "price context" sheet — tapping
// a post's price badge (see components/ride/RideCard.tsx +
// PriceAnalysisSheet.tsx). There's no real per-route community-average
// pipeline yet, so the baseline is the IRS standard mileage rate × the
// post's own recorded trip distance (distance_text, e.g. "56.9 mi", saved
// from the Directions API at post-creation time) — a real per-post
// reference, not a flat guess. Swap in an actual aggregated-average source
// once that exists; the tiering/rendering logic below doesn't need to change.
const IRS_MILEAGE_RATE = 0.725; // $/mile
// Falls back to this when a post has no distance_text (e.g. older posts
// created before that field existed, or a kind that doesn't track it).
const DEFAULT_DISTANCE_MI = 40;
// +/- band treated as "at market" — user-specified range was 15-20%,
// picked the lower/more-sensitive end.
const ADJUST_THRESHOLD_PCT = 15;

export type PriceTier = 'above' | 'avg' | 'below';

export interface PriceAnalysis {
  tier: PriceTier;
  // null when within the +/-ADJUST_THRESHOLD_PCT "at market" band.
  percent: number | null;
  baseline: number;
}

function parseDistanceMiles(distanceText?: string): number {
  const n = distanceText ? parseFloat(distanceText) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DISTANCE_MI;
}

export function buildPriceAnalysis(amount: number, distanceText?: string): PriceAnalysis {
  const baseline = Math.round(IRS_MILEAGE_RATE * parseDistanceMiles(distanceText));
  const diff = ((amount - baseline) / baseline) * 100;
  const tier: PriceTier = diff > ADJUST_THRESHOLD_PCT ? 'above' : diff < -ADJUST_THRESHOLD_PCT ? 'below' : 'avg';
  const pct = Math.round(Math.abs(diff));
  return { tier, percent: pct <= ADJUST_THRESHOLD_PCT ? null : pct, baseline };
}
