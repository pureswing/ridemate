import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { Subscription } from '@/types';
import { fonts, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';

// Admin-only self-toggle — see supabase/migrations/063_admin_invites.sql and
// supabase/functions/admin-set-subscription. Real writes, unlike Membership's
// mock checkout: the Edge Function re-verifies is_admin server-side before
// touching subscriptions, this screen never assumes the client-side gate is
// enough on its own. period_end is always null here (never expires).
export default function AdminScreen() {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { setSubscription } = useAuthStore();
  const { isDonor } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke('admin-set-subscription', {
      body: { plan: isDonor ? 'free' : 'donor' },
    });
    setLoading(false);
    if (invokeError || data?.error) {
      setError(data?.error ?? invokeError?.message ?? t.admin.errorGeneric);
      return;
    }
    setSubscription(data.subscription as Subscription);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />
      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 24, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg, zIndex: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {t.admin.eyebrow}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ alignItems: 'center', marginTop: 14 }}>
          <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: '#1C1410', borderWidth: 1, borderColor: theme.borderGold, alignItems: 'center', justifyContent: 'center', ...shadows.gold }}>
            <Icon name="shield" size={28} color={theme.gold300} />
          </View>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 21, letterSpacing: letterSpacingFor(21, tracking.tight), color: theme.cream, marginTop: 10, textAlign: 'center' }}>
            {t.admin.title}
          </Text>
        </View>
      </LinearGradient>

      <View style={{ flex: 1, marginTop: -20 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, gap: 20, paddingBottom: insets.bottom + 40 }}>
          <Card padding={16} radius={18} elevation="lg">
            <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: letterSpacingFor(10.5, tracking.wide), color: theme.textFaint }}>
              {t.admin.currentStatus}
            </Text>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: theme.text, marginTop: 4 }}>
              {isDonor ? t.subscription.donor : t.subscription.free}
            </Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.muted, marginTop: 6 }}>
              {isDonor ? t.admin.donorNoExpiry : t.admin.freeDescription}
            </Text>
            <View style={{ marginTop: 16 }}>
              <Button variant="primary" size="lg" fullWidth disabled={loading} onPress={toggle}>
                {loading ? t.admin.updating : isDonor ? t.admin.setFree : t.admin.setDonor}
              </Button>
            </View>
            {error && (
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.danger, marginTop: 10 }}>
                {error}
              </Text>
            )}
          </Card>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.textFaint, textAlign: 'center', lineHeight: 18 }}>
            {t.admin.disclaimer}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}
