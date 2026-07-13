import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';

export default function AuthLayout() {
  const { session, loading, isPasswordRecovery } = useAuthStore();
  const t = useTranslation();

  useEffect(() => {
    // A recovery-link session must stay on reset-password, not bounce to (tabs) —
    // see the isPasswordRecovery comment in store/authStore.ts.
    if (!loading && session && !isPasswordRecovery) {
      router.replace('/(tabs)');
    }
  }, [session, loading, isPasswordRecovery]);

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="welcome">
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen
        name="disclaimer"
        options={{ presentation: 'modal', headerShown: true, title: t.disclaimer.title }}
      />
    </Stack>
  );
}
