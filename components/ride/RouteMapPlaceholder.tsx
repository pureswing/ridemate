import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { fonts, radii } from '@/constants/themes';

// Decorative placeholder for the route preview shown before a real route map
// exists yet (see services/routeMap.ts — the real PNG is only generated at
// submit time) — matches the design system's MapHolder.jsx look (dashed gold
// border, a dotted route path + two endpoint dots via react-native-svg,
// centered pill label). Tapping is a no-op.
export function RouteMapPlaceholder({ accent, theme, label }: { accent: string; theme: ReturnType<typeof useTheme>; label: string }) {
  return (
    <View style={{
      position: 'relative', width: '100%', height: 210, borderRadius: 14,
      borderWidth: 1.5, borderColor: theme.borderGold, borderStyle: 'dashed',
      overflow: 'hidden', backgroundColor: theme.driverSoft,
    }}>
      <Svg viewBox="0 0 360 210" width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        <Path d="M44 160 C 120 60, 230 60, 316 90" stroke={accent} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeDasharray="2 9" />
        <Circle cx={44} cy={160} r={6} fill={accent} stroke="#fff" strokeWidth={3} />
        <Circle cx={316} cy={90} r={6} fill={accent} stroke="#fff" strokeWidth={3} />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9,
          borderRadius: radii.pill, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
        }}>
          <Icon name="location" size={16} color={accent} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: theme.text }}>{label}</Text>
        </View>
      </View>
    </View>
  );
}
