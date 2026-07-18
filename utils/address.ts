// Best-effort city extraction from a Google Places formatted address, e.g.
// "2100 NW 42nd Ave, Miami, FL 33142, USA" -> "Miami". Shared by the ride
// post create/edit forms wherever a selected place needs to fill origin/
// destination city fields.
export function cityFromAddress(formattedAddress: string): string | null {
  const parts = formattedAddress.split(',').map((s) => s.trim());
  return parts.length > 1 ? parts[1] : null;
}
