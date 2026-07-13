import { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthBackButton } from '@/components/auth/AuthBackButton';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { radii } from '@/constants/themes';
import { textStyles } from '@/constants/typography';

const emailOk = (e: string) => /\S+@\S+\.\S+/.test(e);

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { resetPasswordForEmail, loading } = useAuth();
  const t = useTranslation();
  const theme = useTheme();

  async function handleSend() {
    try {
      await resetPasswordForEmail(email.trim().toLowerCase());
      setSent(true);
    } catch (e: any) {
      Alert.alert(t.auth.forgotPassword.errorTitle, e.message);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <AuthBackButton onPress={() => router.back()} />
      {/* ScrollView (even though nothing scrolls here) — a Button as a direct
          descendant of a plain View outside any ScrollView silently failed to
          paint its text/gradient on this RN version; see welcome.tsx. */}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <AuthHeader
        title={sent ? t.auth.forgotPassword.sentTitle : t.auth.forgotPassword.title}
        subtitle={sent ? t.auth.forgotPassword.sentSubtitle : t.auth.forgotPassword.subtitle}
      />
      {!sent ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 24, gap: 14 }}>
          <AuthInput icon="email" placeholder={t.register.email} keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Button variant="primary" size="lg" icon="email" fullWidth disabled={!emailOk(email) || loading} onPress={handleSend}>
            {t.auth.forgotPassword.send}
          </Button>
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 16 }}>
          <View style={{ width: 64, height: 64, borderRadius: radii.xl, backgroundColor: theme.driverSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="email" size={32} color={theme.secondary} />
          </View>
          <Text style={{ ...textStyles.bodySm, color: theme.muted, textAlign: 'center', maxWidth: 260 }}>
            {t.auth.forgotPassword.sentBody.replace('{email}', email)}
          </Text>
          <Button variant="ghost" size="lg" fullWidth onPress={() => { setSent(false); setEmail(''); }}>
            {t.auth.forgotPassword.tryDifferent}
          </Button>
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}
