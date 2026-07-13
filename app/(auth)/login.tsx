import { useState } from 'react';
import { View, Alert, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthBackButton } from '@/components/auth/AuthBackButton';
import { KeyboardWrapper } from '@/components/auth/KeyboardWrapper';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/constants/themes';

const emailOk = (e: string) => /\S+@\S+\.\S+/.test(e);

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading } = useAuth();
  const t = useTranslation();
  const theme = useTheme();

  const ready = emailOk(email) && password.length >= 1;

  async function handleLogin() {
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (e: any) {
      Alert.alert(t.login.errorTitle, e.message);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <AuthBackButton onPress={() => router.back()} />
      {/* Android's default windowSoftInputMode is already "adjustResize" — even with
          behavior={undefined}, KeyboardAvoidingView still subscribes to keyboard
          show/hide events on Android and was causing focus to drop right after the
          keyboard opened. Skip it entirely on Android; iOS still needs "padding". */}
      <KeyboardWrapper>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <AuthHeader title={t.login.welcomeTitle} subtitle={t.login.welcomeSubtitle} />
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 24, gap: 14 }}>
            <AuthInput icon="email" placeholder={t.login.email} keyboardType="email-address" value={email} onChangeText={setEmail} />
            <AuthInput icon="lock" placeholder={t.login.password} secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={handleLogin} />
            <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={{ alignSelf: 'flex-end' }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: theme.primary }}>{t.login.forgotPassword}</Text>
            </Pressable>
            <Button variant="primary" size="lg" icon="log_in" fullWidth disabled={!ready || loading} onPress={handleLogin} style={{ marginTop: 4 }}>
              {loading ? t.login.signingIn : t.login.signIn}
            </Button>
          </View>
          <View style={{ paddingHorizontal: 28, paddingBottom: 32, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: theme.muted }}>
              {t.login.noAccount}
              <Text onPress={() => router.push('/(auth)/register')} style={{ fontFamily: fonts.bodyBold, color: theme.primary }}>
                {t.login.signUp}
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardWrapper>
    </SafeAreaView>
  );
}
