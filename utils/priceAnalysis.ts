// Price-context calculation for the feed's price-analysis sheet — tapping a
// post's price badge (see components/ride/RideCard.tsx + RideCardGrid.tsx +
// PriceAnalysisSheet.tsx). The baseline is now the REAL historical average
// donation for that exact route (get_route_price_stats,
// supabase/migrations/009_route_price_stats.sql / 062_price_analysis_platform_gate.sql),
// not a flat IRS-mileage-rate guess — the whole feature is gated off
// platform-wide until there's enough real data (see
// hooks/usePriceAnalysisGate.ts)), and per-route it further requires
// MIN_ROUTE_SAMPLE_SIZE real posts for that exact origin/destination pair
// before treating the average as meaningful, matching the same floor
// app/post/ride.tsx already uses for its own route-average hint.
const MIN_ROUTE_SAMPLE_SIZE = 3;
// +/- band treated as "at market" — user-specified range was 15-20%,
// picked the lower/more-sensitive end.
const ADJUST_THRESHOLD_PCT = 15;

export type PriceTier = 'above' | 'avg' | 'below';

export interface PriceAnalysis {
  // null when the route doesn't have enough real samples yet to compare against.
  tier: PriceTier | null;
  // null when within the +/-ADJUST_THRESHOLD_PCT "at market" band, or when tier is null.
  percent: number | null;
  baseline: number | null;
  sampleSize: number;
}

export function buildPriceAnalysis(amount: number, avgDonation: number | null, sampleSize: number): PriceAnalysis {
  if (avgDonation == null || sampleSize < MIN_ROUTE_SAMPLE_SIZE) {
    return { tier: null, percent: null, baseline: null, sampleSize };
  }
  const diff = ((amount - avgDonation) / avgDonation) * 100;
  const tier: PriceTier = diff > ADJUST_THRESHOLD_PCT ? 'above' : diff < -ADJUST_THRESHOLD_PCT ? 'below' : 'avg';
  const pct = Math.round(Math.abs(diff));
  return { tier, percent: pct <= ADJUST_THRESHOLD_PCT ? null : pct, baseline: avgDonation, sampleSize };
}
