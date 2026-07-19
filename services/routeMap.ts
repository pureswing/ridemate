// Route map image — Directions API (real driving route) + Static Maps API
// (bakes origin/destination markers + the route polyline into a single PNG).
//
// Two call sites:
// 1. app/post/ride.tsx / app/ride/edit/[id].tsx's live preview (debounced,
//    fires again each time origin/destination settles on a new value while
//    the user is still editing the form — a deliberate, user-approved cost,
//    see [[feedback-api-efficiency]]) via `getRouteDetails` + `buildStaticMapUrl`.
// 2. Final submit, which uploads the actual PNG bytes to Supabase Storage —
//    `generateRouteMapImage`, which reuses the preview's already-fetched
//    RouteDetails (passed in as `cached`) instead of calling Directions a
//    second time for the same origin/destination pair.
// Once submitted, the stored image is never regenerated just because someone
// views the post — see components/ride/RouteMap.tsx for the display side.

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteDetails {
  polyline: string | null;
  durationText: string | null;
  durationSeconds: number | null;
  distanceText: string | null;
}

const EMPTY_ROUTE_DETAILS: RouteDetails = { polyline: null, durationText: null, durationSeconds: null, distanceText: null };

export async function getRouteDetails(origin: LatLng, destination: LatLng, waypoints?: string[]): Promise<RouteDetails> {
  if (!API_KEY) return EMPTY_ROUTE_DETAILS;

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    key: API_KEY,
  });
  // Waypoints are plain address text (same free-text the "add stop" rows
  // collect) — the Directions API geocodes each one itself, same as it
  // would for a typed origin/destination, so no separate Places lookup is
  // needed just to route through them.
  if (waypoints && waypoints.length > 0) {
    params.set('waypoints', waypoints.join('|'));
  }

  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`);
    const data = await res.json();
    if (data.status !== 'OK') return EMPTY_ROUTE_DETAILS;
    const route = data.routes?.[0];
    const leg = route?.legs?.[0];
    return {
      polyline: route?.overview_polyline?.points ?? null,
      durationText: leg?.duration?.text ?? null,
      durationSeconds: leg?.duration?.value ?? null,
      distanceText: leg?.distance?.text ?? null,
    };
  } catch {
    return EMPTY_ROUTE_DETAILS;
  }
}

// Pure URL construction, no network call — safe to call on every render if
// needed. Handing this straight to an <Image source={{ uri }}> lets RN do its
// own fetch/cache instead of us downloading bytes we don't need yet.
export function buildStaticMapUrl(origin: LatLng, destination: LatLng, polyline: string | null, waypoints?: string[]): string {
  const params = new URLSearchParams({
    size: '640x480',
    scale: '2',
    maptype: 'roadmap',
    key: API_KEY ?? '',
  });
  // Declutter — keep streets for orientation, drop POI/transit icons and
  // labels so the route itself stays the visual focus.
  params.append('style', 'feature:poi|visibility:off');
  params.append('style', 'feature:transit|visibility:off');
  params.append('markers', `color:0x0E9C93|label:A|${origin.lat},${origin.lng}`);
  // Stop markers use plain address text — same as the Directions waypoints,
  // Static Maps geocodes marker locations itself, no lat/lng needed. Labels
  // only go up to 9 (single-char limit); beyond that the marker still shows,
  // just unlabeled.
  (waypoints ?? []).forEach((w, i) => {
    const label = i < 9 ? `label:${i + 1}|` : '';
    params.append('markers', `color:0xF5A623|${label}${w}`);
  });
  params.append('markers', `color:0xFF6243|label:B|${destination.lat},${destination.lng}`);
  if (polyline) {
    params.append('path', `color:0xFF6243|weight:4|enc:${polyline}`);
  }
  return `https://maps.googleapis.com/maps/api/staticmap?${params}`;
}

export interface RouteMapResult {
  image: ArrayBuffer | null;
  durationText: string | null;
  durationSeconds: number | null;
  distanceText: string | null;
}

// Returns the generated PNG's raw bytes (ready to hand to Supabase Storage's
// .upload()) plus the route's duration/distance — or nulls if the key is
// missing or the calls failed (caller should treat this as "no map/no
// stats" and submit the post anyway — none of this blocks submission).
//
// Pass `cached` (the live preview's already-fetched RouteDetails, for the
// same origin/destination) to skip a redundant Directions call — only the
// Static Maps PNG itself still needs fetching, since we need real bytes to
// upload, not just a displayable URL.
export async function generateRouteMapImage(origin: LatLng, destination: LatLng, cached?: RouteDetails, waypoints?: string[]): Promise<RouteMapResult> {
  if (!API_KEY) return { image: null, durationText: null, durationSeconds: null, distanceText: null };
  const { polyline, durationText, durationSeconds, distanceText } = cached ?? await getRouteDetails(origin, destination, waypoints);
  const url = buildStaticMapUrl(origin, destination, polyline, waypoints);
  try {
    const res = await fetch(url);
    if (!res.ok) return { image: null, durationText, durationSeconds, distanceText };
    return { image: await res.arrayBuffer(), durationText, durationSeconds, distanceText };
  } catch {
    return { image: null, durationText, durationSeconds, distanceText };
  }
}
