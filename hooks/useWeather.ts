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

// Miami — fallback when location permission is denied or unavailable.
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

function codeToWeather(code: number): { icon: IconName; labelKey: WeatherLabelKey } {
  if (code === 0 || code === 1) return { icon: 'weather_sun', labelKey: 'clear' };
  if (code === 2 || code === 3) return { icon: 'weather_cloud', labelKey: code === 3 ? 'overcast' : 'partlyCloudy' };
  if (code === 45 || code === 48) return { icon: 'weather_cloud', labelKey: 'foggy' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: 'weather_rain', labelKey: 'rain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: 'weather_snow', labelKey: 'snow' };
  if ([95, 96, 99].includes(code)) return { icon: 'weather_storm', labelKey: 'thunderstorms' };
  return { icon: 'weather_cloud', labelKey: 'cloudy' };
}

// Free, keyless API (open-meteo.com) — not subject to the paid-API cost
// concerns that apply to Places/Distance Matrix/AeroDataBox.
export function useWeather(): Weather | null {
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function apply(lat: number, lon: number, city?: string) {
      try {
        const res = await withTimeout(
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`),
          6000
        );
        const data = await res.json();
        if (cancelled || !data?.current) throw new Error('no data');
        const w = codeToWeather(data.current.weather_code);
        setWeather({ temp: Math.round(data.current.temperature_2m), icon: w.icon, labelKey: w.labelKey, city });
      } catch {
        if (!cancelled) setWeather({ temp: 84, icon: 'weather_sun', labelKey: 'clear' });
      }
    }

    (async () => {
      try {
        // Requests (not just checks) the permission — the Feed header is the
        // first real reason to ask, so asking right when it mounts is the
        // most direct path to a real location instead of always falling back.
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }), 6000);
          if (cancelled) return;

          // Device-native reverse geocoding (Apple/Google's own geocoder via
          // expo-location) — no separate API, no key, no network cost, unlike
          // a Places/geocoding API call would be.
          let city: string | undefined;
          try {
            const [place] = await withTimeout(
              Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              4000
            );
            city = place?.city ?? undefined;
          } catch {
            // city stays undefined — weather line just omits it
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

  return weather;
}
