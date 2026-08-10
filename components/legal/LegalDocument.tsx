import { View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { IconName } from '@/constants/icons';

interface LegalSection {
  heading: string;
  body: string;
}

interface Props {
  icon: IconName;
  title: string;
  lastUpdated: string;
  intro: string;
  sections: readonly LegalSection[];
}

// Shared chrome for the full Terms of Service / Privacy Policy screens
// (app/legal/terms.tsx, app/legal/privacy.tsx) — reachable both pre-auth
// (welcome.tsx's footer links) and from Profile → About, so it has no
// session dependency, same as app/profile/about.tsx.
export function LegalDocument({ icon, title, lastUpdated, intro, sections }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 22, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg, zIndex: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          <View style={{ width: 44 }} />
          <View style={{ width: 44 }} />
        </View>

        <View style={{ alignItems: 'center', marginTop: 10, paddingHorizontal: 28 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#1C1410', borderWidth: 1, borderColor: theme.borderGold, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Icon name={icon} size={24} color={theme.gold300} />
          </View>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 21, letterSpacing: letterSpacingFor(21, tracking.tight), color: theme.cream, textAlign: 'center' }}>
            {title}
          </Text>
          <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
            {lastUpdated}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.textSecondary, lineHeight: 20, marginBottom: 24 }}>
          {intro}
        </Text>

        {sections.map((s, i) => (
          <View key={i} style={{ marginBottom: i < sections.length - 1 ? 20 : 0 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: theme.text, marginBottom: 6 }}>
              {i + 1}. {s.heading}
            </Text>
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.textSecondary, lineHeight: 20 }}>
              {s.body}
            </Text>
          </View>
        ))}

        <View style={{
          flexDirection: 'row', gap: 8, marginTop: 28, padding: 14,
          backgroundColor: theme.badgeWarnBg, borderRadius: radii.md,
          borderWidth: 1, borderColor: theme.borderGold,
        }}>
          <Icon name="info" size={14} color={theme.badgeWarnFg} />
          <Text style={{ flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.badgeWarnFg, lineHeight: 18 }}>
            {t.legal.acknowledgement}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
