import { Text as RNText, TextProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

// Base font for all Text. Explicit fontFamily in a component's own style overrides this.
// Never pair a custom fontFamily with fontWeight on Android — the OS looks for a bold
// variant under that exact family name, finds none, and falls back to system font.
// Visual weight must come from the TTF file name only (e.g. Lato_700Bold vs Lato_400Regular).
export function ThemedText({ style, ...props }: TextProps) {
  const { fontBody } = useTheme();
  return <RNText style={[{ fontFamily: fontBody, letterSpacing: 0.3 }, style]} {...props} />;
}
