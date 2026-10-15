// Jobs must happen in Florida (origin, destination, every stop) — this is
// about where the WORK is done, never where the user is: someone in New
// York can still book a MIA pickup. The real enforcement is the
// ride_posts_florida_only trigger (supabase/migrations/068_florida_only_job_location.sql);
// this client copy just rejects an out-of-state address the moment it's
// picked instead of failing at publish. Keep the polygon in sync with the
// migration's is_in_florida().
//
// Simplified outline as [lng, lat] — land borders traced closely, coast
// side offshore with margin (Keys and Dry Tortugas in, Bahamas/Cuba out).
const FLORIDA_POLYGON: [number, number][] = [
  [-87.60, 31.00], [-85.00, 31.00], [-84.86, 30.71], [-82.22, 30.57], [-82.04, 30.75],
  [-81.44, 30.71], [-80.90, 30.71], [-80.20, 29.50], [-79.90, 27.50], [-79.95, 25.30],
  [-80.05, 24.90], [-81.00, 24.35], [-82.20, 24.30], [-83.15, 24.45], [-83.40, 26.50],
  [-83.80, 28.20], [-84.60, 29.30], [-85.60, 29.40], [-86.60, 30.10], [-87.53, 30.15],
  [-87.53, 30.28], [-87.43, 30.45],
];

// Ray casting point-in-polygon.
export function isInFlorida(lat: number, lng: number): boolean {
  let inside = false;
  for (let i = 0, j = FLORIDA_POLYGON.length - 1; i < FLORIDA_POLYGON.length; j = i++) {
    const [xi, yi] = FLORIDA_POLYGON[i];
    const [xj, yj] = FLORIDA_POLYGON[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
