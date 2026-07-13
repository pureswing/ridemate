// AeroDataBox via RapidAPI — 500 free calls/month
// Sign up at: https://rapidapi.com/aedbx-aedbx/api/aerodatabox
// Set EXPO_PUBLIC_RAPIDAPI_KEY in your .env file

export interface FlightInfo {
  flightNumber: string;
  airline: string;
  status: string;
  departure: {
    airport: string;
    iata: string;
    scheduledTime: string;  // e.g. "2026-06-23 14:30"
    terminal?: string;
    gate?: string;
  };
  arrival: {
    airport: string;
    iata: string;
    scheduledTime: string;
    terminal?: string;
    gate?: string;
  };
}

export async function lookupFlight(flightIata: string, date?: string): Promise<FlightInfo | null> {
  const key = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
  if (!key || key === '...' || key.trim() === '') {
    console.warn('[flightInfo] EXPO_PUBLIC_RAPIDAPI_KEY is not configured in .env');
    return null;
  }

  const normalized = flightIata.replace(/\s+/g, '').toUpperCase();
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  const url = `https://aerodatabox.p.rapidapi.com/flights/Number/${normalized}/${targetDate}`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
      },
    });

    const text = await res.text().catch(() => '');

    if (!res.ok) {
      console.warn(`[flightInfo] HTTP ${res.status} for ${normalized}: ${text.slice(0, 300)}`);
      return null;
    }

    if (!text || text.trim() === '') {
      console.info(`[flightInfo] Empty response for ${normalized} on ${targetDate} — flight not found or date out of range`);
      return null;
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn(`[flightInfo] Invalid JSON for ${normalized}: ${text.slice(0, 200)}`);
      return null;
    }

    // Handle both array responses and wrapped responses
    const flights: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.flights)
      ? data.flights
      : [];

    if (flights.length === 0) {
      console.info(`[flightInfo] No flights found for ${normalized} on ${targetDate}`);
      return null;
    }

    const f = flights[0];

    // Normalize departure/arrival — API may nest differently across versions
    const dep = f.departure ?? {};
    const arr = f.arrival ?? {};

    // Scheduled time may be "2026-06-23 14:30" or "2026-06-23T14:30:00" or "14:30-04:00"
    const depTime = dep.scheduledTime?.local ?? dep.scheduledTime?.utc ?? dep.scheduledTime ?? '';
    const arrTime = arr.scheduledTime?.local ?? arr.scheduledTime?.utc ?? arr.scheduledTime ?? '';

    return {
      flightNumber: normalized,
      airline: f.airline?.name ?? f.airlineCode ?? '',
      status: f.status ?? f.flightStatus ?? 'Scheduled',
      departure: {
        airport: dep.airport?.name ?? dep.airportName ?? '',
        iata: dep.airport?.iata ?? dep.iata ?? '',
        scheduledTime: normalizeTimeString(depTime, targetDate),
        terminal: dep.terminal ?? undefined,
        gate: dep.gate ?? undefined,
      },
      arrival: {
        airport: arr.airport?.name ?? arr.airportName ?? '',
        iata: arr.airport?.iata ?? arr.iata ?? '',
        scheduledTime: normalizeTimeString(arrTime, targetDate),
        terminal: arr.terminal ?? undefined,
        gate: arr.gate ?? undefined,
      },
    };
  } catch (e) {
    console.error('[flightInfo] Network or parse error:', e);
    return null;
  }
}

// Normalize various time formats to "YYYY-MM-DD HH:MM"
function normalizeTimeString(raw: string, fallbackDate: string): string {
  if (!raw) return '';
  // Already in "YYYY-MM-DD HH:MM..." form
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)) return raw;
  // ISO form "2026-06-23T14:30:00..."
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
    return raw.slice(0, 10) + ' ' + raw.slice(11, 16);
  }
  // Time-only "14:30-04:00" or "14:30"
  const timeOnly = raw.slice(0, 5);
  return `${fallbackDate} ${timeOnly}`;
}

// Parse "YYYY-MM-DD HH:MM" into { date, time }
export function parseFlightTime(localTime: string): { date: string; time: string } | null {
  if (!localTime) return null;
  const [date, time] = localTime.split(' ');
  if (!date || !time) return null;
  return { date, time: time.slice(0, 5) };
}
