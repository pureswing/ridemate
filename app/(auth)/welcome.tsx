import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts, radii, shadows } from '@/constants/themes';
import { textStyles } from '@/constants/typography';

// Auth entry point — branding + Create account / Sign in.
// The source design system puts this on a full-bleed gradient background, but its
// "day" token pass redefines --gradient-midnight to the same coral-gold gradient as
// the primary button and body text stays a muted slate meant for a light card — gold
// button on gold background, low-contrast body text. Using the cream app background
// here instead keeps the gradient as the icon badge accent, where it still pops.
export default function WelcomeScreen() {
  const theme = useTheme();
  const t = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <LinearGradient
          colors={theme.gradientGold as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 72, height: 72, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center', marginBottom: 24, ...shadows.gold }}
        >
          <Icon name="car" size={38} color={theme.textOnPrimary} />
        </LinearGradient>
        <Text style={{ ...textStyles.h1, color: theme.text, marginBottom: 6, textAlign: 'center' }}>
          RideMate
        </Text>
        <Text style={{ ...textStyles.eyebrow, color: theme.primary, marginBottom: 32, textAlign: 'center' }}>
          {t.auth.welcome.tagline}
        </Text>
        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 15, color: theme.muted, lineHeight: 24, maxWidth: 280, textAlign: 'center' }}>
          {t.auth.welcome.body}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 28, paddingTop: 8, paddingBottom: 40, gap: 16 }}>
        <Button variant="primary" size="lg" icon="user_plus" fullWidth onPress={() => router.push('/(auth)/register')}>
          {t.auth.welcome.createAccount}
        </Button>
        <Button variant="ghost" size="lg" icon="log_in" fullWidth onPress={() => router.push('/(auth)/login')}>
          {t.auth.welcome.signIn}
        </Button>
        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint, textAlign: 'center', marginTop: 10 }}>
          {t.auth.welcome.termsPrefix}{' '}
          <Text style={{ color: theme.primary, fontFamily: fonts.bodyBold }}>{t.auth.welcome.terms}</Text>
          {' '}{t.auth.welcome.and}{' '}
          <Text style={{ color: theme.primary, fontFamily: fonts.bodyBold }}>{t.auth.welcome.privacy}</Text>
        </Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}
