import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { IconName } from '@/constants/icons';

// Keys, not literal strings — the app is multi-language, so the label gets
// translated by the component that renders it (see HomeHeader.tsx).
export type WeatherLabelKey = 'clear' | 'partlyCloudy' | 'overcast' | 'foggy' | 'rain' | 'snow' | 'thunderstorms' | 'cloudy';

interface Weather {
  temp: number;
  icon: IconName;
  labelKey: WeatherLabelKey;
  city?: string;
}

interface WeatherState {
  weather: Weather | null;
  // True once a real fetch attempt has been exhausted (after the retry
  // below) and failed — lets the header show "weather unavailable" instead
  // of either "loading" forever or, as this replaced, a hardcoded 84°F/Clear
  // stand-in silently presented as real. That fallback was the actual bug
  // reported: two devices standing in the same city showed different
  // temperatures because one had quietly fallen back to the fake reading
  // while still carrying a real (GPS-resolved) city name — nothing in the
  // UI distinguished "real" from "made up".
  failed: boolean;
}

// Miami — fallback coordinates when location permission is denied or
// unavailable. Still a REAL API call for those coordinates, just with no
// city label attached (see apply()'s callers) — never a fabricated reading.
const FALLBACK_LAT = 25.7617;
const FALLBACK_LON = -80.1918;

// getCurrentPositionAsync doesn't reject when it can't get a GPS fix (common on
// emulators, or indoors) — it just never resolves, which without a timeout means
// the weather line silently never appears instead of falling back.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

// Reverse geocode via Nominatim (OpenStreetMap) — free, keyless, no per-call
// cost. Replaced expo-location's device-native reverseGeocodeAsync, which
// turned out to be unreliable on some Android devices/manufacturers (OnePlus
// in particular kept failing to resolve a city at all, leaving the weather
// line with a real temperature but no location — see the on-device report
// that led to this). Nominatim's usage policy caps this at ~1 request/second
// and asks for an identifying User-Agent — both trivially satisfied by one
// call per Home screen mount. Falls back to undefined (weather line just
// omits the city) on any failure, same as before — never a fabricated name.
//
// Confirmed via on-device debugging that a stuck/flaky RN fetch() to this
// host on some networks (curl from the same device's shell succeeds in
// under a second when RN's fetch times out — looks like an OkHttp/IPv6
// path issue on that network, not this app or Nominatim) is a real,
// occasional failure mode outside this code's control; the retry + "just
// omit the city" fallback below is the correct degraded behavior for it.
async function reverseGeocodeCity(lat: number, lon: number): Promise<string | undefined> {
  const res = await withTimeout(
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`, {
      headers: { 'User-Agent': 'BoteGo/1.0 (contact: support@botego.app)' },
    }),
    5000
  );
  const data = await res.json();
  const address = data?.address;
  return address?.city ?? address?.town ?? address?.village ?? address?.hamlet ?? address?.municipality ?? undefined;
}

function codeToWeather(code: number): { icon: IconName; labelKey: WeatherLabelKey } {
  if (code === 0 || code === 1) return { icon: 'weather_sun', labelKey: 'clear' };
  if (code === 2 || code === 3) return { icon: 'weather_cloud', labelKey: code === 3 ? 'overcast' : 'partlyCloudy' };
  if (code === 45 || code === 48) return { icon: 'weather_cloud', labelKey: 'foggy' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: 'weather_rain', labelKey: 'rain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: 'weather_snow', labelKey: 'snow' };
  if ([95, 96, 99].includes(code)) return { icon: 'weather_storm', labelKey: 'thunderstorms' };
  return { icon: 'weather_cloud', labelKey: 'cloudy' };
}

async function fetchWeatherOnce(lat: number, lon: number): Promise<Weather> {
  const res = await withTimeout(
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`),
    6000
  );
  const data = await res.json();
  if (!data?.current) throw new Error('no data');
  const w = codeToWeather(data.current.weather_code);
  return { temp: Math.round(data.current.temperature_2m), icon: w.icon, labelKey: w.labelKey };
}

// Free, keyless API (open-meteo.com) — not subject to the paid-API cost
// concerns that apply to Places/Distance Matrix/AeroDataBox.
export function useWeather(): WeatherState {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function apply(lat: number, lon: number, city?: string) {
      // One retry — a single network hiccup shouldn't surface as "weather
      // unavailable" when a second attempt would likely succeed.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const w = await fetchWeatherOnce(lat, lon);
          if (!cancelled) setWeather({ ...w, city });
          return;
        } catch {
          // fall through to retry, or to the failed state below
        }
      }
      if (!cancelled) setFailed(true);
    }

    (async () => {
      try {
        // Requests (not just checks) the permission — the Feed header is the
        // first real reason to ask, so asking right when it mounts is the
        // most direct path to a real location instead of always falling back.
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // A cold GPS fix (getCurrentPositionAsync) can take well past this
          // hook's timeout indoors or with a poor sky view — confirmed
          // on-device (a desk-bound test phone timed out after 6s waiting
          // for a fresh fix). getLastKnownPositionAsync returns Android/iOS's
          // already-cached last fix near-instantly when one exists, which is
          // plenty accurate for "what city am I roughly in" — only falls
          // through to waiting on a fresh fix if there's truly no cached one.
          const cachedPos = await Location.getLastKnownPositionAsync({ maxAge: 15 * 60_000 });
          const pos = cachedPos ?? await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }), 6000);
          if (cancelled) return;

          // One retry, same reasoning as the weather fetch's retry below —
          // a single slow/dropped request on a flaky connection shouldn't
          // be the difference between showing "Winter Haven" and nothing.
          let city: string | undefined;
          for (let attempt = 0; attempt < 2 && !city; attempt++) {
            try {
              city = await reverseGeocodeCity(pos.coords.latitude, pos.coords.longitude);
            } catch {
              // city stays undefined — weather line just omits it
            }
          }

          if (!cancelled) apply(pos.coords.latitude, pos.coords.longitude, city);
          return;
        }
      } catch {
        // fall through to fallback coords
      }
      if (!cancelled) apply(FALLBACK_LAT, FALLBACK_LON);
    })();

    return () => { cancelled = true; };
  }, []);

  return { weather, failed };
}
