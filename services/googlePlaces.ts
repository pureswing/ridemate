// Google Places API (Web Service) — no native module needed
// Sign up at: https://console.cloud.google.com
// Enable: Places API, Maps JavaScript API
// Set EXPO_PUBLIC_GOOGLE_MAPS_KEY in your .env file

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

// Florida launch-market restriction — center shifted northwest of the
// peninsula's geographic middle so a single circle can reach both Key West
// and the far end of the panhandle (Pensacola), the two points a
// peninsula-centered circle would otherwise miss. Paired with
// `strictbounds` below, this is a hard filter, not just a bias — some
// bleed into southern Georgia/Alabama at the edges is an accepted
// trade-off of using a circle for a non-circular state.
const FLORIDA_CENTER = { lat: 28.5, lng: -83.5 };
const FLORIDA_RADIUS  = 550_000; // meters (~340 miles) — covers the whole state with margin

// A session token bundles an Autocomplete typing burst + the final Place
// Details call into one billed "session" instead of Google charging each
// keystroke's predictions call and the details call separately — pass the
// same token to every getPlacePredictions call in a typing burst and to
// the getPlaceDetail call that ends it. Doesn't need cryptographic
// randomness, just unique enough per session.
export function newPlacesSessionToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetail {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  name: string;
  // Parsed from address_components, not guessed from formattedAddress's
  // comma position — an establishment result (e.g. "Home Depot, 1530
  // FL-50, Clermont, FL 34711, USA") shifts every segment over by one
  // versus a plain street address, so a fixed-index split silently grabs
  // the street ("1530 FL-50") instead of the city. Null if Google didn't
  // return a locality-level component at all.
  city: string | null;
}

// Google's address_components don't have a single "city" type — prefer
// locality (the common case), fall through to the levels that stand in for
// it in areas without an incorporated locality (e.g. some unincorporated
// Florida communities).
function cityFromComponents(components: { long_name: string; types: string[] }[]): string | null {
  const preferredTypes = ['locality', 'postal_town', 'sublocality', 'administrative_area_level_3'];
  for (const type of preferredTypes) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match.long_name;
  }
  return null;
}

export async function getPlacePredictions(input: string, sessionToken?: string): Promise<PlacePrediction[]> {
  if (!API_KEY || input.length < 3) return [];

  const params = new URLSearchParams({
    input,
    key: API_KEY,
    components: 'country:us',
    location: `${FLORIDA_CENTER.lat},${FLORIDA_CENTER.lng}`,
    radius: String(FLORIDA_RADIUS),
    strictbounds: 'true',
    types: 'geocode|establishment',
  });
  if (sessionToken) params.set('sessiontoken', sessionToken);

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
    );
    const data = await res.json();
    if (data.status !== 'OK') return [];
    return data.predictions.map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting.main_text,
      secondaryText: p.structured_formatting.secondary_text ?? '',
    }));
  } catch {
    return [];
  }
}

// Resolves a plain address string to lat/lng — used when a value comes from
// somewhere other than live Places autocomplete (e.g. a saved address book
// entry, which only ever stored the text, never a PlaceDetail) but the
// caller still needs real coordinates, e.g. to draw the route map. One-off
// call tied to an explicit user action (picking a saved slot), not per
// keystroke, so it doesn't need a session token.
export async function geocodeAddress(address: string): Promise<{ placeId: string; lat: number; lng: number } | null> {
  if (!API_KEY || !address.trim()) return null;

  const params = new URLSearchParams({ address, key: API_KEY });

  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.[0]) return null;
    const result = data.results[0];
    return { placeId: result.place_id, lat: result.geometry.location.lat, lng: result.geometry.location.lng };
  } catch {
    return null;
  }
}

export async function getPlaceDetail(placeId: string, sessionToken?: string): Promise<PlaceDetail | null> {
  if (!API_KEY) return null;

  const params = new URLSearchParams({
    place_id: placeId,
    key: API_KEY,
    fields: 'place_id,name,formatted_address,geometry,address_components',
  });
  if (sessionToken) params.set('sessiontoken', sessionToken);

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`
    );
    const data = await res.json();
    if (data.status !== 'OK') return null;
    const r = data.result;
    return {
      placeId,
      formattedAddress: r.formatted_address,
      name: r.name,
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      city: cityFromComponents(r.address_components ?? []),
    };
  } catch {
    return null;
  }
}
