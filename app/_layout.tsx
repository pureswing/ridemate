import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import '../global.css';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { applyAuthDeepLink } from '@/lib/authDeepLink';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation } from '@/hooks/useTranslation';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setSession, setLoading } = useAuthStore();
  const { loadProfile } = useAuth();
  const { loadLanguage } = useLanguageStore();
  const t = useTranslation();

  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold: require('@expo-google-fonts/bricolage-grotesque/600SemiBold/BricolageGrotesque_600SemiBold.ttf'),
    BricolageGrotesque_700Bold:     require('@expo-google-fonts/bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.ttf'),
    BricolageGrotesque_800ExtraBold: require('@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf'),
    PlusJakartaSans_400Regular:  require('@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf'),
    PlusJakartaSans_500Medium:   require('@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf'),
    PlusJakartaSans_600SemiBold: require('@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf'),
    PlusJakartaSans_700Bold:     require('@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf'),
    PlusJakartaSans_700Bold_Italic: require('@expo-google-fonts/plus-jakarta-sans/700Bold_Italic/PlusJakartaSans_700Bold_Italic.ttf'),
  });

  useEffect(() => {
    loadLanguage();
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Email-confirmation and password-recovery links open ridemate://verify or
  // ridemate://reset-password with the session tokens in the URL fragment.
  useEffect(() => {
    Linking.getInitialURL().then((url) => { if (url) applyAuthDeepLink(url); });
    const sub = Linking.addEventListener('url', ({ url }) => applyAuthDeepLink(url));
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* translucent so screen content (e.g. HomeHeader's gradient) can extend
            behind the status bar instead of a solid bar sitting above it — Expo Go
            only honors this via the JS-level prop here, not app.json's native
            androidStatusBar config (that only applies to a real dev-client/EAS build). */}
        <StatusBar style="dark" translucent />
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="ride/[id]"
            options={{ title: t.nav.rideDetail, headerBackTitle: t.nav.back }}
          />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
