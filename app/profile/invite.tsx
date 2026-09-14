import { useCallback, useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';
import { CardBox } from '@/components/ui/CardBox';
import { RowDivider } from '@/components/ui/RowDivider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { Invite } from '@/types';
import { fonts, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';

// Admin-only Donor seeding tool — see supabase/migrations/063_admin_invites.sql
// and supabase/functions/send-invite-email. This is deliberately NOT the
// public referral/milestones feature deferred in the Membership pricing
// pass — it's the app owner personally inviting specific people by email.
export default function InviteScreen() {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('invites').select('*').order('created_at', { ascending: false });
    setInvites((data as Invite[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadInvites(); }, [loadInvites]));

  async function sendInvite() {
    if (!email.trim()) return;
    setSending(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke('send-invite-email', {
      body: { email: email.trim() },
    });
    setSending(false);
    if (invokeError || data?.error) {
      setError(data?.error ?? invokeError?.message ?? t.invite.errorGeneric);
      return;
    }
    setEmail('');
    loadInvites();
  }

  const STATUS_TONE: Record<Invite['status'], 'success' | 'warning' | 'neutral'> = {
    accepted: 'success',
    sent: 'warning',
    pending: 'neutral',
    failed: 'neutral',
  };
  const STATUS_LABEL: Record<Invite['status'], string> = {
    pending: t.invite.statusPending,
    sent: t.invite.statusSent,
    accepted: t.invite.statusAccepted,
    failed: t.invite.statusFailed,
  };

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
            {t.invite.eyebrow}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ alignItems: 'center', marginTop: 14 }}>
          <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: '#1C1410', borderWidth: 1, borderColor: theme.borderGold, alignItems: 'center', justifyContent: 'center', ...shadows.gold }}>
            <Icon name="user_plus" size={28} color={theme.gold300} />
          </View>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 21, letterSpacing: letterSpacingFor(21, tracking.tight), color: theme.cream, marginTop: 10, textAlign: 'center' }}>
            {t.invite.title}
          </Text>
        </View>
      </LinearGradient>

      <View style={{ flex: 1, marginTop: -20 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, gap: 20, paddingBottom: insets.bottom + 40 }}>
          <Card padding={16} radius={18} elevation="lg">
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.muted, marginBottom: 12 }}>
              {t.invite.subtitle}
            </Text>
            <Input
              placeholder={t.invite.emailPlaceholder}
              icon="email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <View style={{ marginTop: 12 }}>
              <Button variant="primary" size="lg" fullWidth disabled={sending || !email.trim()} onPress={sendInvite}>
                {sending ? t.invite.sending : t.invite.send}
              </Button>
            </View>
            {error && (
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.danger, marginTop: 10 }}>
                {error}
              </Text>
            )}
          </Card>

          <View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: theme.text, marginBottom: 12 }}>
              {t.invite.historyTitle}
            </Text>
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : invites.length === 0 ? (
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.textFaint }}>
                {t.invite.historyEmpty}
              </Text>
            ) : (
              <CardBox>
                {invites.map((invite, i) => (
                  <View key={invite.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: theme.text }}>
                          {invite.email}
                        </Text>
                        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11.5, color: theme.textFaint, marginTop: 1 }}>
                          {new Date(invite.created_at).toLocaleDateString(t.locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                      <Badge tone={STATUS_TONE[invite.status]} size="sm">{STATUS_LABEL[invite.status]}</Badge>
                    </View>
                    {i < invites.length - 1 && <RowDivider theme={theme} />}
                  </View>
                ))}
              </CardBox>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
