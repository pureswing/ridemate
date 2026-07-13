import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { fonts, radii, shadows } from '@/constants/themes';
import { textStyles, tracking, leading, letterSpacingFor } from '@/constants/typography';

interface Props {
  title: string;
  subtitle: string;
}

// Auth flow branding header — gold car badge + display title + muted subtitle.
export function AuthHeader({ title, subtitle }: Props) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 28, paddingTop: 32 }}>
      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 64, height: 64, borderRadius: radii.lg,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 18,
          ...shadows.gold,
        }}
      >
        <Icon name="car" size={32} color={theme.textOnPrimary} />
      </LinearGradient>
      {/* Not textStyles.h2 — this is the same 28px size but ExtraBold (matches
          welcome.tsx's hero-title weight), where h2 elsewhere is Bold. Two
          genuinely different weight specs at the same size, so this stays its
          own inline style rather than forcing one preset to cover both. */}
      <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: 28, color: theme.text, letterSpacing: letterSpacingFor(28, tracking.tighter), lineHeight: Math.round(28 * leading.tight), marginBottom: 8, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ ...textStyles.bodySm, color: theme.muted, maxWidth: 260, textAlign: 'center' }}>
        {subtitle}
      </Text>
    </View>
  );
}
