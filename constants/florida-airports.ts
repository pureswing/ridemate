export interface Airport {
  iata: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
}

export const FLORIDA_AIRPORTS: Airport[] = [
  { iata: 'MIA', name: 'Miami International Airport',                  city: 'Miami',           lat: 25.7959, lng: -80.2870 },
  { iata: 'FLL', name: 'Fort Lauderdale-Hollywood International',      city: 'Fort Lauderdale', lat: 26.0726, lng: -80.1527 },
  { iata: 'MCO', name: 'Orlando International Airport',                city: 'Orlando',         lat: 28.4312, lng: -81.3081 },
  { iata: 'TPA', name: 'Tampa International Airport',                  city: 'Tampa',           lat: 27.9756, lng: -82.5332 },
  { iata: 'PBI', name: 'Palm Beach International Airport',             city: 'West Palm Beach', lat: 26.6832, lng: -80.0956 },
  { iata: 'JAX', name: 'Jacksonville International Airport',           city: 'Jacksonville',    lat: 30.4941, lng: -81.6879 },
  { iata: 'RSW', name: 'Southwest Florida International Airport',      city: 'Fort Myers',      lat: 26.5362, lng: -81.7552 },
  { iata: 'SRQ', name: 'Sarasota Bradenton International Airport',     city: 'Sarasota',        lat: 27.3954, lng: -82.5543 },
  { iata: 'PIE', name: 'St. Pete-Clearwater International Airport',    city: 'St. Petersburg',  lat: 27.9102, lng: -82.6874 },
  { iata: 'DAB', name: 'Daytona Beach International Airport',          city: 'Daytona Beach',   lat: 29.1799, lng: -81.0581 },
  { iata: 'EYW', name: 'Key West International Airport',               city: 'Key West',        lat: 24.5562, lng: -81.7595 },
  { iata: 'GNV', name: 'Gainesville Regional Airport',                 city: 'Gainesville',     lat: 29.6900, lng: -82.2717 },
  { iata: 'TLH', name: 'Tallahassee International Airport',            city: 'Tallahassee',     lat: 30.3965, lng: -84.3503 },
  { iata: 'PNS', name: 'Pensacola International Airport',              city: 'Pensacola',       lat: 30.4734, lng: -87.1866 },
  { iata: 'MLB', name: 'Melbourne Orlando International Airport',      city: 'Melbourne',       lat: 28.1028, lng: -80.6453 },
  { iata: 'SFB', name: 'Orlando Sanford International Airport',        city: 'Sanford',         lat: 28.7776, lng: -81.2375 },
];

export function detectAirport(text: string): Airport | null {
  if (!text || text.length < 2) return null;
  const upper = text.toUpperCase().trim();
  // Match by IATA code
  const byCode = FLORIDA_AIRPORTS.find(a => upper === a.iata || upper.includes(`(${a.iata})`));
  if (byCode) return byCode;
  // Match by name keywords
  const lower = text.toLowerCase();
  return FLORIDA_AIRPORTS.find(a =>
    lower.includes(a.iata.toLowerCase()) ||
    lower.includes(a.name.toLowerCase().split(' ').slice(0, 2).join(' ')) ||
    (lower.includes('airport') && lower.includes(a.city.toLowerCase()))
  ) ?? null;
}
