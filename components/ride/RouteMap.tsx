import { View, Image } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  routeMapUrl?: string;
  origin: string;
  destination: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
}

// Displays the route map PNG generated once at post-creation time (see
// services/routeMap.ts + the upload in app/post/ride.tsx's handleSubmit) —
// this component never calls the Maps API itself. Renders nothing for
// posts created before this existed (no stored image to show).
//
// Static image only, no tap action — external navigation will be added
// later, gated to only be available once creator and driver have an
// agreement in place.
export function RouteMap({ routeMapUrl }: Props) {
  const theme = useTheme();

  if (!routeMapUrl) return null;

  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, marginBottom: 16 }}>
      <Image source={{ uri: routeMapUrl }} style={{ width: '100%', height: 210 }} resizeMode="cover" />
    </View>
  );
}
