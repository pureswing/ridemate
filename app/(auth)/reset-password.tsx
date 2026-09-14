import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { InfoSheet } from '@/components/ui/InfoSheet';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AuthInput } from '@/components/auth/AuthInput';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { textStyles } from '@/constants/typography';

const pwOk = (p: string) => p.length >= 8;

// Reached via the botego://reset-password link from the reset email — the
// recovery session is set asynchronously by lib/authDeepLink.ts as the app cold
// boots, which can lose the race with this screen mounting. Wait briefly for it
// before declaring the link invalid.
export default function ResetPasswordScreen() {
  const session = useAuthStore((s) => s.session);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { updatePassword, loading } = useAuth();
  const t = useTranslation();
  const theme = useTheme();

  useEffect(() => {
    if (session) { setChecking(false); return; }
    const timeout = setTimeout(() => setChecking(false), 2500);
    return () => clearTimeout(timeout);
  }, [session]);

  const ready = pwOk(password) && password === confirmPassword;

  async function handleSubmit() {
    try {
      await updatePassword(password);
      await supabase.auth.signOut();
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        {/* ScrollView (even though nothing scrolls here) — a Button as a direct
            descendant of a plain View outside any ScrollView silently failed to
            paint its text/gradient on this RN version; see welcome.tsx. */}
        <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
          {checking ? (
            <Text style={{ ...textStyles.bodySm, color: theme.muted }}>…</Text>
          ) : (
            <>
              <Text style={{ ...textStyles.bodySm, color: theme.muted, textAlign: 'center', marginBottom: 20 }}>
                {t.auth.resetPassword.invalidLink}
              </Text>
              <Button variant="primary" size="lg" onPress={() => router.replace('/(auth)/forgot-password')}>
                {t.auth.forgotPassword.title}
              </Button>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <AuthHeader title={t.auth.resetPassword.title} subtitle={t.auth.resetPassword.subtitle} />
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 24, gap: 14 }}>
        <AuthInput icon="lock" placeholder={t.auth.resetPassword.newPassword} secureTextEntry value={password} onChangeText={setPassword} />
        <PasswordStrength password={password} />
        <AuthInput
          icon="lock" placeholder={t.auth.resetPassword.confirmPassword} secureTextEntry
          value={confirmPassword} onChangeText={setConfirmPassword}
          error={confirmPassword && password !== confirmPassword ? t.register.passwordMismatch : undefined}
        />
        <Button variant="primary" size="lg" icon="check" fullWidth disabled={!ready || loading} onPress={handleSubmit}>
          {t.auth.resetPassword.submit}
        </Button>
      </View>
      </ScrollView>

      <InfoSheet
        visible={success}
        tone="info"
        icon="check_circle"
        title={t.auth.resetPassword.successTitle}
        message={t.auth.resetPassword.successMsg}
        confirmLabel={t.auth.resetPassword.continueLabel}
        onClose={() => router.replace('/(auth)/login')}
      />
      <InfoSheet
        visible={!!error}
        tone="danger"
        icon="warning"
        title={t.auth.resetPassword.errorTitle}
        message={error ?? ''}
        confirmLabel={t.auth.resetPassword.errorDismiss}
        onClose={() => setError(null)}
      />
    </SafeAreaView>
  );
}
