// Google Places API (Web Service) — no native module needed
// Sign up at: https://console.cloud.google.com
// Enable: Places API, Maps JavaScript API
// Set EXPO_PUBLIC_GOOGLE_MAPS_KEY in your .env file

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

// Florida bounding box center for biasing results
const FLORIDA_CENTER = { lat: 27.5, lng: -81.5 };
const FLORIDA_RADIUS  = 500_000; // meters (~310 miles)

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
}

export async function getPlacePredictions(input: string): Promise<PlacePrediction[]> {
  if (!API_KEY || input.length < 3) return [];

  const params = new URLSearchParams({
    input,
    key: API_KEY,
    components: 'country:us',
    location: `${FLORIDA_CENTER.lat},${FLORIDA_CENTER.lng}`,
    radius: String(FLORIDA_RADIUS),
    types: 'geocode|establishment',
  });

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

export async function getPlaceDetail(placeId: string): Promise<PlaceDetail | null> {
  if (!API_KEY) return null;

  const params = new URLSearchParams({
    place_id: placeId,
    key: API_KEY,
    fields: 'place_id,name,formatted_address,geometry',
  });

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
    };
  } catch {
    return null;
  }
}
