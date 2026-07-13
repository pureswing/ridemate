import { View, TouchableOpacity, Image, Linking, ActivityIndicator } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';

const MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

interface Props {
  origin: string;
  destination: string;
  scheduledAt: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
}

interface RouteInfo {
  durationText: string;
  distanceText: string;
  etaText: string;
}

export function RouteMap({ origin, destination, scheduledAt, originLat, originLng, destinationLat, destinationLng }: Props) {
  const t = useTranslation();
  const theme = useTheme();
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Prefer lat,lng over geocoding a city string
  const originParam  = (originLat      != null && originLng      != null) ? `${originLat},${originLng}`      : encodeURIComponent(origin      + ', Florida');
  const destParam    = (destinationLat != null && destinationLng != null) ? `${destinationLat},${destinationLng}` : encodeURIComponent(destination + ', Florida');

  const simpleMapUrl = MAPS_API_KEY
    ? `https://maps.googleapis.com/maps/api/staticmap` +
      `?size=600x200&maptype=roadmap&zoom=7` +
      `&markers=color:green|label:A|${originParam}` +
      `&markers=color:red|label:B|${destParam}` +
      `&key=${MAPS_API_KEY}`
    : null;

  useEffect(() => {
    if (MAPS_API_KEY) fetchRouteInfo();
  }, [origin, destination, originLat, originLng, destinationLat, destinationLng]);

  async function fetchRouteInfo() {
    setLoadingRoute(true);
    try {
      const url =
        `https://maps.googleapis.com/maps/api/distancematrix/json` +
        `?origins=${originParam}` +
        `&destinations=${destParam}` +
        `&departure_time=now` +
        `&traffic_model=best_guess` +
        `&key=${MAPS_API_KEY}`;

      const res = await fetch(url);
      const json = await res.json();
      const element = json?.rows?.[0]?.elements?.[0];
      if (element?.status === 'OK') {
        const scheduledDate = new Date(scheduledAt);
        const durationSecs = element.duration_in_traffic?.value ?? element.duration?.value ?? 0;
        const eta = new Date(scheduledDate.getTime() + durationSecs * 1000);
        setRouteInfo({
          durationText: element.duration_in_traffic?.text ?? element.duration?.text ?? '',
          distanceText: element.distance?.text ?? '',
          etaText: eta.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } catch {
      // silently fail — map is optional
    } finally {
      setLoadingRoute(false);
    }
  }

  function openNavigation() {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=driving`;
    Linking.openURL(url);
  }

  if (!MAPS_API_KEY) return null;

  return (
    <View className="mb-4 rounded-2xl overflow-hidden border border-border">
      {/* Static map image */}
      <TouchableOpacity onPress={openNavigation} activeOpacity={0.9}>
        <Image
          source={{ uri: simpleMapUrl! }}
          style={{ width: '100%', height: 160 }}
          resizeMode="cover"
        />
        <View className="absolute bottom-2 right-2 bg-black/60 rounded-lg px-2 py-1">
          <Text className="text-white text-xs">🗺 Open navigation →</Text>
        </View>
      </TouchableOpacity>

      {/* ETA bar */}
      <View className="bg-surface px-4 py-3 flex-row justify-between items-center">
        {loadingRoute ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : routeInfo ? (
          <>
            <View className="flex-row items-center gap-1">
              <Text className="text-muted text-xs">🕐</Text>
              <Text className="text-text text-sm font-semibold">{routeInfo.durationText}</Text>
              <Text className="text-muted text-xs ml-1">({routeInfo.distanceText})</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-muted text-xs">📍 ETA</Text>
              <Text className="text-primary text-sm font-bold">{routeInfo.etaText}</Text>
            </View>
          </>
        ) : (
          <Text className="text-muted text-xs">{origin} → {destination}</Text>
        )}
      </View>
    </View>
  );
}
