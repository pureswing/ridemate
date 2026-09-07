import { useEffect, useState } from 'react';
import { useRides } from '@/hooks/useRides';

// Platform-wide floor behind the feed's price-analysis pill/modal — see
// supabase/migrations/062_price_analysis_platform_gate.sql. The whole
// feature (not just one route's number) stays hidden until RideMate has
// ~100 real priced ride posts total. Every RideCard/RideCardGrid instance
// in a feed would otherwise each fire this RPC on mount — cached at module
// scope so it only actually runs once per app session, refreshed lazily if
// a later mount happens after the in-flight call already settled.
const PLATFORM_MIN_SAMPLE_SIZE = 100;
let cachedEnabled: boolean | null = null;
let inFlight: Promise<boolean> | null = null;

export function usePriceAnalysisGate() {
  const { getPlatformPriceSampleSize } = useRides();
  const [enabled, setEnabled] = useState(cachedEnabled ?? false);

  useEffect(() => {
    if (cachedEnabled != null) { setEnabled(cachedEnabled); return; }
    if (!inFlight) {
      inFlight = getPlatformPriceSampleSize()
        .then((n) => n >= PLATFORM_MIN_SAMPLE_SIZE)
        .catch(() => false);
    }
    inFlight.then((result) => { cachedEnabled = result; setEnabled(result); });
  }, []);

  return enabled;
}
