import { View, ScrollView, StyleProp, ViewStyle } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/constants/themes';

interface Props {
  origin: string;
  destination: string;
  originColor?: string;
  destColor?: string;
  style?: StyleProp<ViewStyle>;
}

// RouteLine — origin → destination with two dots joined by a dashed track.
// The source design auto-scrolls long routes with a JS drift animation; a
// native horizontal ScrollView already handles touch-scroll on its own, so
// that gimmick (built for hover-less desktop preview) isn't ported here.
export function RouteLine({ origin, destination, originColor, destColor, style }: Props) {
  const theme = useTheme();
  const oColor = originColor ?? theme.secondary;
  const dColor = destColor ?? theme.primary;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: '100%' }}>
        <View style={{ width: 11, height: 11, borderRadius: 999, backgroundColor: oColor, flexShrink: 0 }} />
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: theme.text, letterSpacing: -0.1, flexShrink: 0 }}>
          {origin}
        </Text>
        <View style={{ flex: 1, minWidth: 24, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: theme.border }} />
        <Icon name="arrow_forward" size={16} color={theme.textFaint} />
        <View style={{ width: 11, height: 11, borderRadius: 999, backgroundColor: dColor, flexShrink: 0 }} />
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: theme.text, letterSpacing: -0.1, flexShrink: 0 }}>
          {destination}
        </Text>
      </View>
    </ScrollView>
  );
}
