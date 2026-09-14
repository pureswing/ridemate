import { View, StyleProp, ViewStyle } from 'react-native';
import { ThemedText as Text } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/constants/themes';

// The BoteGo wordmark — "Bote" in extra-bold, "Go" a weight lighter, same
// split-weight treatment picked from the brand exploration canvas.
// onGradient: solid cream, for the Miami Sunset gradient hero (About header,
// this screen's own icon badge context). onLight: adds a two-hue gradient
// fill split across the two halves, for use on cream/white surfaces where
// gradient-filled text is actually legible (gradient-on-gradient isn't).
export function Wordmark({
  variant = 'onLight', size = 26, style,
}: {
  variant?: 'onLight' | 'onGradient';
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  if (variant === 'onGradient') {
    return (
      <View style={[{ flexDirection: 'row' }, style]}>
        <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: size, letterSpacing: -size * 0.01, color: theme.cream }}>Bote</Text>
        <Text style={{ fontFamily: fonts.displaySemibold, fontSize: size, letterSpacing: -size * 0.01, color: theme.cream, opacity: 0.88 }}>Go</Text>
      </View>
    );
  }

  // RN can't do CSS gradient-fill text without pulling in MaskedView, so the
  // two-tone effect here is two flat colors lifted from the ends of
  // gradientGold rather than a true gradient across the glyphs.
  return (
    <View style={[{ flexDirection: 'row' }, style]}>
      <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: size, letterSpacing: -size * 0.01, color: theme.gradientGold[0] }}>Bote</Text>
      <Text style={{ fontFamily: fonts.displaySemibold, fontSize: size, letterSpacing: -size * 0.01, color: theme.gradientGold[2] }}>Go</Text>
    </View>
  );
}
