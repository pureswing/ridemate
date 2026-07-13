import { useState } from 'react';
import { Pressable, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText as Text } from './ThemedText';
import { Icon } from './Icon';
import { IconName } from '@/constants/icons';
import { useTheme } from '@/hooks/useTheme';
import { controlHeight, radii, fonts, shadows, ShadowStyle, chromeMaxFontSizeMultiplier } from '@/constants/themes';
import { tracking, leading, letterSpacingFor } from '@/constants/typography';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  children: string;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  trailingIcon?: IconName;
  fullWidth?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// icon ≈ 80% of fontSize, not equal — an icon fills its full square bounds, but a
// font's cap-height (what uppercase button text actually draws) is only ~70-75% of
// its fontSize, so same-number icon/text reads visibly icon-heavy.
const SIZES: Record<Size, { height: number; paddingHorizontal: number; fontSize: number; icon: number; gap: number }> = {
  sm: { height: controlHeight.sm, paddingHorizontal: 16, fontSize: 14, icon: 11, gap: 7 },
  md: { height: controlHeight.md, paddingHorizontal: 22, fontSize: 16, icon: 13, gap: 8 },
  lg: { height: controlHeight.lg, paddingHorizontal: 28, fontSize: 18, icon: 15, gap: 10 },
};

// RideMate Button — pill-shaped, bold uppercase label, colored CTA glow on primary.
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  trailingIcon,
  fullWidth = false,
  disabled = false,
  onPress,
  style,
}: Props) {
  const theme = useTheme();
  const s = SIZES[size];
  const [pressed, setPressed] = useState(false);

  const variants: Record<Variant, { gradient?: readonly string[]; background?: string; textColor: string; shadow?: ShadowStyle; border?: string }> = {
    primary:   { gradient: theme.gradientGold, textColor: theme.textOnPrimary, shadow: shadows.gold },
    secondary: { background: theme.secondary, textColor: '#FFFFFF', shadow: shadows.jade },
    outline:   { background: theme.surface, textColor: theme.text, shadow: shadows.xs, border: theme.borderGold },
    ghost:     { background: 'transparent', textColor: theme.primary },
    danger:    { gradient: theme.gradientOrchid, textColor: '#FFFFFF', shadow: shadows.orchid },
  };
  const v = variants[variant];

  return (
    // All visual styling (size, background, shadow, press-scale) lives on this plain
    // View with a STATIC style object. Pressable below carries NO visual/sizing style
    // of its own — it's just an absolutely-positioned touch layer, because putting any
    // sizing style (height, even flex:1) directly on a Pressable was unreliable here.
    <View
      style={[
        {
          height: s.height,
          width: fullWidth ? '100%' : undefined,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          borderRadius: radii.pill,
          backgroundColor: v.background,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border,
          opacity: disabled ? 0.45 : 1,
          transform: pressed && !disabled ? [{ scale: 0.96 }] : [{ scale: 1 }],
          ...(v.shadow ?? {}),
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
      <View
        collapsable={false}
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: s.gap,
          paddingHorizontal: s.paddingHorizontal,
        }}
      >
        {icon && <Icon name={icon} size={s.icon} color={v.textColor} />}
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
            color: v.textColor,
            textTransform: 'uppercase',
            letterSpacing: letterSpacingFor(s.fontSize, tracking.wide),
          }}
        >
          {children}
        </Text>
        {trailingIcon && <Icon name={trailingIcon} size={s.icon} color={v.textColor} />}
      </View>
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        disabled={disabled}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}
