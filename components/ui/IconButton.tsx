import { useState } from 'react';
import { Pressable, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from './Icon';
import { IconName } from '@/constants/icons';
import { useTheme } from '@/hooks/useTheme';
import { radii, shadows, ShadowStyle } from '@/constants/themes';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'soft' | 'solid' | 'ghost' | 'glass';

interface Props {
  icon: IconName;
  size?: Size;
  variant?: Variant;
  label: string;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  // Overrides the variant's default shadow — e.g. the feed header uses shadows.xs
  // on every button/chip in its filter row, constant regardless of state.
  shadow?: ShadowStyle;
}

const SIZES: Record<Size, { box: number; icon: number }> = {
  sm: { box: 36, icon: 18 },
  md: { box: 44, icon: 20 },
  lg: { box: 54, icon: 24 },
};

// Circular icon-only button.
export function IconButton({ icon, size = 'md', variant = 'soft', label, disabled = false, onPress, style, shadow }: Props) {
  const theme = useTheme();
  const s = SIZES[size];
  const [pressed, setPressed] = useState(false);

  const variants: Record<Variant, { gradient?: readonly string[]; background?: string; color: string; shadow?: ShadowStyle }> = {
    soft:  { background: theme.surfaceAlt, color: theme.text },
    solid: { gradient: theme.gradientGold, color: theme.textOnPrimary, shadow: shadows.gold },
    ghost: { background: 'transparent', color: theme.textSecondary },
    glass: { background: theme.surface, color: theme.text, shadow: shadows.sm },
  };
  const v = variants[variant];
  const resolvedShadow = shadow ?? v.shadow;

  return (
    // All visual styling lives on this plain View with a static style object —
    // see Button.tsx for why Pressable itself carries no sizing/visual style.
    <View
      style={[
        {
          width: s.box,
          height: s.box,
          borderRadius: radii.pill,
          backgroundColor: v.background,
          opacity: disabled ? 0.45 : 1,
          transform: pressed && !disabled ? [{ scale: 0.9 }] : [{ scale: 1 }],
          ...(resolvedShadow ?? {}),
        },
        style,
      ]}
    >
      {v.gradient && (
        <LinearGradient
          colors={v.gradient as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radii.pill }]}
        />
      )}
      <View collapsable={false} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={s.icon} color={v.color} />
      </View>
      <Pressable
        accessibilityLabel={label}
        onPress={disabled ? undefined : onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        disabled={disabled}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}
