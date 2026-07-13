import { useState } from 'react';
import { Pressable, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText as Text } from './ThemedText';
import { Icon } from './Icon';
import { IconName } from '@/constants/icons';
import { useTheme } from '@/hooks/useTheme';
import { radii, fonts, shadows, chromeMaxFontSizeMultiplier } from '@/constants/themes';
import { tracking, leading, letterSpacingFor } from '@/constants/typography';

type Size = 'sm' | 'md';

interface Props {
  children: string;
  selected?: boolean;
  icon?: IconName;
  count?: number;
  size?: Size;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  // Selected-state gradient override — defaults to the brand gold gradient, but
  // e.g. the feed's service-type chips use the jade/driver gradient instead.
  color?: readonly string[];
}

const SIZES: Record<Size, { height: number; paddingHorizontal: number; fontSize: number; icon: number }> = {
  sm: { height: 32, paddingHorizontal: 11, fontSize: 12, icon: 10 },
  md: { height: 38, paddingHorizontal: 15, fontSize: 14, icon: 11 },
};

// Chip — selectable filter pill used in the feed filter row.
export function Chip({ children, selected = false, icon, count, size = 'md', onPress, style, color }: Props) {
  const theme = useTheme();
  const textColor = selected ? theme.textOnPrimary : theme.textSecondary;
  const [pressed, setPressed] = useState(false);
  const gradient = color ?? theme.gradientGold;
  const s = SIZES[size];

  return (
    // All visual styling lives on this plain View with a static style object —
    // see Button.tsx for why Pressable itself carries no sizing/visual style.
    <View
      style={[
        {
          height: s.height,
          alignSelf: 'flex-start',
          // Lets the chip compress instead of overflowing when several sit in a
          // flex:1 row narrower than their combined natural width (e.g. longer
          // Spanish labels) — paired with adjustsFontSizeToFit below.
          flexShrink: 1,
          borderRadius: radii.pill,
          backgroundColor: selected ? undefined : theme.surface,
          borderWidth: selected ? 0 : 1.5,
          borderColor: theme.border,
          transform: pressed ? [{ scale: 0.96 }] : [{ scale: 1 }],
          ...(selected ? shadows.gold : shadows.xs),
        },
        style,
      ]}
    >
      {selected && (
        <LinearGradient
          colors={gradient as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radii.pill }]}
        />
      )}
      <View collapsable={false} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: s.paddingHorizontal }}>
        {icon && <Icon name={icon} size={s.icon} color={textColor} />}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          maxFontSizeMultiplier={chromeMaxFontSizeMultiplier}
          style={{
            flexShrink: 1,
            fontFamily: fonts.bodySemibold,
            fontSize: s.fontSize,
            lineHeight: Math.round(s.fontSize * leading.snug),
            letterSpacing: letterSpacingFor(s.fontSize, tracking.tight),
            color: textColor,
          }}
        >
          {children}
        </Text>
        {count != null && (
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: radii.pill,
              backgroundColor: selected ? 'rgba(255,255,255,0.28)' : theme.surfaceAlt,
            }}
          >
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: textColor }}>{count}</Text>
          </View>
        )}
      </View>
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}
