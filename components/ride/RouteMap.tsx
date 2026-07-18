import { View, TouchableOpacity, Image, Linking } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
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
export function RouteMap({ routeMapUrl, origin, destination, originLat, originLng, destinationLat, destinationLng }: Props) {
  const theme = useTheme();

  if (!routeMapUrl) return null;

  const originParam = (originLat != null && originLng != null) ? `${originLat},${originLng}` : encodeURIComponent(origin + ', Florida');
  const destParam = (destinationLat != null && destinationLng != null) ? `${destinationLat},${destinationLng}` : encodeURIComponent(destination + ', Florida');

  function openNavigation() {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=driving`);
  }

  return (
    <TouchableOpacity
      onPress={openNavigation}
      activeOpacity={0.9}
      style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, marginBottom: 16 }}
    >
      <Image source={{ uri: routeMapUrl }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
      <View style={{
        position: 'absolute', bottom: 8, right: 8,
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 4,
      }}>
        <Icon name="navigation" size={12} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 11 }}>Open navigation</Text>
      </View>
    </TouchableOpacity>
  );
}
