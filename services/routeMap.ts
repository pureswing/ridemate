// Route map image — Directions API (real driving route, called once) +
// Static Maps API (bakes origin/destination markers + the route polyline
// into a single PNG). Generated once at post-creation time and stored in
// Supabase Storage — never called again just because someone views the
// post. See components/ride/RouteMap.tsx for the display side.

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

interface LatLng {
  lat: number;
  lng: number;
}

async function getRoutePolyline(origin: LatLng, destination: LatLng): Promise<string | null> {
  if (!API_KEY) return null;

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    key: API_KEY,
  });

  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`);
    const data = await res.json();
    if (data.status !== 'OK') return null;
    return data.routes?.[0]?.overview_polyline?.points ?? null;
  } catch {
    return null;
  }
}

function buildStaticMapUrl(origin: LatLng, destination: LatLng, polyline: string | null): string {
  const params = new URLSearchParams({
    size: '640x320',
    scale: '2',
    maptype: 'roadmap',
    key: API_KEY ?? '',
  });
  params.append('markers', `color:0x0E9C93|label:A|${origin.lat},${origin.lng}`);
  params.append('markers', `color:0xFF6243|label:B|${destination.lat},${destination.lng}`);
  if (polyline) {
    params.append('path', `color:0xFF6243|weight:4|enc:${polyline}`);
  }
  return `https://maps.googleapis.com/maps/api/staticmap?${params}`;
}

// Returns the generated PNG's raw bytes, ready to hand to Supabase Storage's
// .upload(), or null if the key is missing or either call failed (caller
// should treat this as "no map" and submit the post without one — the map
// is a nice-to-have, never a submission blocker).
export async function generateRouteMapImage(origin: LatLng, destination: LatLng): Promise<ArrayBuffer | null> {
  if (!API_KEY) return null;
  const polyline = await getRoutePolyline(origin, destination);
  const url = buildStaticMapUrl(origin, destination, polyline);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}
