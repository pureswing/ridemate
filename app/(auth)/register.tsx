import { useState } from 'react';
import { View, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthBackButton } from '@/components/auth/AuthBackButton';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { StepDots } from '@/components/auth/StepDots';
import { KeyboardWrapper } from '@/components/auth/KeyboardWrapper';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { fonts, radii } from '@/constants/themes';

const emailOk = (e: string) => /\S+@\S+\.\S+/.test(e);
const pwOk = (p: string) => p.length >= 8;

type Step = 'credentials' | 'identity';

export default function RegisterScreen() {
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [legalName, setLegalName] = useState('');

  const { signUp, upsertLegalName, loading } = useAuth();
  const t = useTranslation();
  const theme = useTheme();

  const step1Ready = emailOk(email) && pwOk(password) && password === confirmPassword;
  const step2Ready = displayName.trim().length >= 2;

  async function handleCreateAccount() {
    try {
      const { needsVerification } = await signUp(email.trim().toLowerCase(), password, displayName.trim());
      // legal_name lives in a separate owner-only table (profile_private) — it can only be
      // written once a session exists, so this is skipped when email confirmation is pending.
      // The user can add it later from Profile once that editor exists.
      if (legalName.trim() && !needsVerification) {
        const { data } = await supabase.auth.getUser();
        if (data.user) await upsertLegalName(data.user.id, legalName.trim());
      }
      router.replace(needsVerification ? { pathname: '/(auth)/verify', params: { email: email.trim() } } : '/(auth)/disclaimer');
    } catch (e: any) {
      Alert.alert(t.register.errorTitle, e.message);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <AuthBackButton onPress={() => (step === 'credentials' ? router.back() : setStep('credentials'))} />
      <KeyboardWrapper>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 28, paddingTop: 16 }}>
            <StepDots current={step === 'credentials' ? 0 : 1} total={2} />
          </View>

          {step === 'credentials' ? (
            <>
              <AuthHeader title={t.register.credentialsTitle} subtitle={t.register.credentialsSubtitle} />
              <View style={{ paddingHorizontal: 28, paddingVertical: 20, gap: 14 }}>
                <AuthInput
                  icon="email" placeholder={t.register.email} keyboardType="email-address"
                  value={email} onChangeText={setEmail} hint={t.register.emailHint}
                />
                <AuthInput icon="lock" placeholder={t.register.passwordPlaceholder} secureTextEntry value={password} onChangeText={setPassword} />
                <PasswordStrength password={password} />
                <AuthInput
                  icon="lock" placeholder={t.register.confirmPassword} secureTextEntry
                  value={confirmPassword} onChangeText={setConfirmPassword}
                  error={confirmPassword && password !== confirmPassword ? t.register.passwordMismatch : undefined}
                />
              </View>
              <View style={{ paddingHorizontal: 28, paddingBottom: 32 }}>
                <Button variant="primary" size="lg" icon="arrow_forward" fullWidth disabled={!step1Ready} onPress={() => setStep('identity')}>
                  {t.register.continueBtn}
                </Button>
              </View>
            </>
          ) : (
            <>
              <AuthHeader title={t.register.identityTitle} subtitle={t.register.identitySubtitle} />
              <View style={{ paddingHorizontal: 28, paddingVertical: 20, gap: 14 }}>
                <AuthInput
                  icon="at_sign" placeholder={t.register.displayName}
                  value={displayName} onChangeText={setDisplayName} hint={t.register.displayNameHint}
                />
                <AuthInput
                  icon="person" placeholder={t.register.legalName}
                  value={legalName} onChangeText={setLegalName} hint={t.register.legalNameHint}
                />
                <View style={{ flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,98,67,0.07)', borderWidth: 1, borderColor: 'rgba(255,98,67,0.2)', borderRadius: radii.md, padding: 14 }}>
                  <Icon name="info" size={15} color={theme.primary} />
                  <Text style={{ flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.muted, lineHeight: 18 }}>
                    {t.register.identityNote}
                  </Text>
                </View>
              </View>
              <View style={{ paddingHorizontal: 28, paddingBottom: 32 }}>
                <Button variant="primary" size="lg" icon="check" fullWidth disabled={!step2Ready || loading} onPress={handleCreateAccount}>
                  {loading ? t.register.creating : t.register.createAccount}
                </Button>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardWrapper>
    </SafeAreaView>
  );
}
