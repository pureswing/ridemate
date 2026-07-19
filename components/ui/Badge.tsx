import { View, StyleProp, ViewStyle } from 'react-native';
import { ThemedText as Text } from './ThemedText';
import { Icon } from './Icon';
import { IconName } from '@/constants/icons';
import { useTheme } from '@/hooks/useTheme';
import { AppTheme, radii, fonts, chromeMaxFontSizeMultiplier } from '@/constants/themes';
import { tracking, leading, letterSpacingFor } from '@/constants/typography';

type Tone = 'neutral' | 'driver' | 'passenger' | 'courier' | 'hauling' | 'success' | 'warning' | 'accent' | 'inverse';
type Size = 'sm' | 'md';

interface Props {
  children: string;
  tone?: Tone;
  icon?: IconName;
  size?: Size;
  iconSize?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}

function tones(theme: AppTheme): Record<Tone, { bg: string; fg: string; border: string }> {
  return {
    neutral:   { bg: theme.surfaceAlt,   fg: theme.textSecondary, border: theme.cardBorder },
    driver:    { bg: theme.driverSoft,   fg: theme.driverText,    border: theme.driverBorder },
    passenger: { bg: theme.passengerSoft, fg: theme.passengerText, border: theme.passengerBorder },
    courier:   { bg: theme.courierSoft,  fg: theme.courierText,   border: theme.courierBorder },
    hauling:   { bg: theme.haulingSoft,  fg: theme.haulingText,   border: theme.haulingBorder },
    success:   { bg: theme.driverSoft,   fg: theme.driverText,    border: theme.driverBorder },
    warning:   { bg: theme.badgeWarnBg,  fg: theme.badgeWarnFg,   border: theme.borderGold },
    accent:    { bg: theme.badgeWarnBg,  fg: theme.badgeWarnFg,   border: theme.borderGold },
    inverse:   { bg: theme.cream,        fg: '#0C0C13',           border: 'transparent' },
  };
}

// Badge — small status / type pill.
export function Badge({ children, tone = 'neutral', icon, size = 'md', iconSize, fontSize, style }: Props) {
  const theme = useTheme();
  const t = tones(theme)[tone];
  // icon ≈ 80% of fontSize — see components/ui/Button.tsx SIZES comment for why.
  const dims = size === 'sm'
    ? { fontSize: 11, paddingHorizontal: 9, paddingVertical: 3, icon: 9, gap: 4 }
    : { fontSize: 12, paddingHorizontal: 11, paddingVertical: 5, icon: 10, gap: 5 };
  if (iconSize != null) dims.icon = iconSize;
  if (fontSize != null) dims.fontSize = fontSize;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          flexShrink: 1,
          gap: dims.gap,
          paddingHorizontal: dims.paddingHorizontal,
          paddingVertical: dims.paddingVertical,
          borderRadius: radii.pill,
          backgroundColor: t.bg,
          borderWidth: 1,
          borderColor: t.border,
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={dims.icon} color={t.fg} />}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        maxFontSizeMultiplier={chromeMaxFontSizeMultiplier}
        style={{
          flexShrink: 1,
          fontFamily: fonts.bodyBold,
          fontSize: dims.fontSize,
          lineHeight: Math.round(dims.fontSize * leading.snug),
          color: t.fg,
          textTransform: 'uppercase',
          letterSpacing: letterSpacingFor(dims.fontSize, tracking.wide),
        }}
      >
        {children}
      </Text>
    </View>
  );
}
