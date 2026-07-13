import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { fonts, radii } from '@/constants/themes';
import { textStyles } from '@/constants/typography';

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const t = useTranslation();
  const theme = useTheme();

  async function handleConfirmed() {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      router.replace('/(auth)/disclaimer');
    } else {
      Alert.alert(t.auth.verify.errorTitle, t.auth.verify.errorMsg);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* ScrollView (even though nothing scrolls here) — a Button as a direct
          descendant of a plain View outside any ScrollView silently failed to
          paint its text/gradient on this RN version; see welcome.tsx. */}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
        <View style={{ width: 72, height: 72, borderRadius: radii.xl, backgroundColor: theme.driverSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Icon name="email" size={36} color={theme.secondary} />
        </View>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, color: theme.text, letterSpacing: -0.5, marginBottom: 10, textAlign: 'center' }}>
          {t.auth.verify.title}
        </Text>
        <Text style={{ ...textStyles.bodySm, color: theme.muted, maxWidth: 280, textAlign: 'center', marginBottom: 32 }}>
          {t.auth.verify.body.replace('{email}', email || t.login.email)}
        </Text>
        <Button variant="primary" size="lg" icon="check" fullWidth onPress={handleConfirmed}>
          {t.auth.verify.confirmed}
        </Button>
        <Text
          onPress={() => router.replace('/(auth)/login')}
          style={{ marginTop: 14, fontFamily: fonts.bodyBold, fontSize: 13, color: theme.textFaint }}
        >
          {t.auth.verify.backToSignIn}
        </Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}
