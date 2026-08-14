// Best-effort city extraction from a formatted address, e.g.
// "2100 NW 42nd Ave, Miami, FL 33142, USA" -> "Miami". Shared by the ride
// post create/edit forms wherever a selected place needs to fill origin/
// destination city fields.
//
// Locates the city by finding the "ST" or "ST ZIP" segment (a 2-letter
// state abbreviation) and taking whatever comes right before it — not just
// a fixed parts[1] index, which broke for shorter address text (e.g. a
// saved-address slot stored as just "Winter Haven, FL": parts[1] there is
// "FL", not the city, and that wrong value was what actually got persisted
// to ride_posts.origin_city / user_favorites.city).
export function cityFromAddress(formattedAddress: string): string | null {
  const parts = formattedAddress.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const stateIdx = parts.findIndex((p) => /^[A-Z]{2}(\s+\d{5}(-\d{4})?)?$/.test(p));
  if (stateIdx > 0) return parts[stateIdx - 1];
  return parts.length > 1 ? parts[1] : parts[0];
}
