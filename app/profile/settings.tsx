import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { CardBox } from '@/components/ui/CardBox';
import { RowDivider } from '@/components/ui/RowDivider';
import { PlainToggleRow } from '@/components/ui/PlainToggleRow';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguageStore } from '@/store/languageStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';

// Ported from ui_kits/ridemate-app/Settings.jsx. Language is backed by a real
// store (useLanguageStore); the notif_master/rides/packages/hauling/
// post_messages/reminders toggles are backed by real profiles columns that
// gate real OS push notifications (see supabase/migrations/
// 053_push_tokens_and_new_post_push.sql, 054_post_message_push.sql,
// 055_ride_reminders.sql, and hooks/usePushNotifications.ts) — deliberately
// push-only, these never show up in the in-app Notification Center
// (app/notifications.tsx). Trip update alerts and trusted-drivers-first
// still have no infrastructure behind them, so they stay UI-only local state.
export default function SettingsScreen() {
  const { signOut, updateProfile } = useAuth();
  const { profile } = useAuthStore();
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useLanguageStore();

  const [trustedFirst, setTrustedFirst] = useState(profile?.trusted_drivers_first ?? true);
  const [notifMaster, setNotifMaster] = useState(profile?.notif_master ?? true);
  const [notifRides, setNotifRides] = useState(profile?.notif_rides ?? true);
  const [notifPackages, setNotifPackages] = useState(profile?.notif_packages ?? true);
  const [notifHauling, setNotifHauling] = useState(profile?.notif_hauling ?? true);
  const [notifPostMessages, setNotifPostMessages] = useState(profile?.notif_post_messages ?? true);
  const [tripUpdates, setTripUpdates] = useState(true);
  const [remindersOn, setRemindersOn] = useState(profile?.notif_reminders ?? false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Optimistic: flip the switch immediately, persist in the background, and
  // roll back only if the save actually fails (no user-facing loading state
  // for a single boolean toggle).
  function persistNotifPref(field: 'notif_master' | 'notif_rides' | 'notif_packages' | 'notif_hauling' | 'notif_post_messages' | 'notif_reminders' | 'trusted_drivers_first', value: boolean, revert: () => void) {
    if (!profile) return;
    updateProfile(profile.id, { [field]: value }).catch(revert);
  }

  async function confirmSignOut() {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    setShowSignOutConfirm(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg, zIndex: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {t.settings.title}
          </Text>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}>
        {/* Language */}
        <View style={{ gap: 10 }}>
          <Text style={sectionLabelStyle(theme)}>{t.settings.languageSection}</Text>
          <View style={{
            flexDirection: 'row', backgroundColor: theme.surfaceAlt, borderRadius: radii.md,
            borderWidth: 1, borderColor: theme.border, padding: 4, gap: 4,
          }}>
            {(['en', 'es'] as const).map((lang) => {
              const active = language === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  onPress={() => setLanguage(lang)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: radii.sm, alignItems: 'center',
                    backgroundColor: active ? theme.surface : 'transparent',
                    ...(active ? shadows.xs : {}),
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: active ? theme.text : theme.muted }}>
                    {lang === 'en' ? t.profile.english : t.profile.spanish}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Search */}
        <View style={{ gap: 10 }}>
          <Text style={sectionLabelStyle(theme)}>{t.settings.searchSection}</Text>
          <CardBox>
            <PlainToggleRow
              icon="passenger"
              label={t.settings.trustedFirst}
              sub={t.settings.trustedFirstSub}
              checked={trustedFirst}
              onChange={(v) => { setTrustedFirst(v); persistNotifPref('trusted_drivers_first', v, () => setTrustedFirst(!v)); }}
              accent={theme.primary}
              theme={theme}
            />
          </CardBox>
        </View>

        {/* Notifications */}
        <View style={{ gap: 10 }}>
          <Text style={sectionLabelStyle(theme)}>{t.settings.notificationsTitle}</Text>
          <CardBox>
            <PlainToggleRow
              icon="notification"
              label={t.settings.notifMaster}
              sub={t.settings.notifMasterSub}
              checked={notifMaster}
              onChange={(v) => { setNotifMaster(v); persistNotifPref('notif_master', v, () => setNotifMaster(!v)); }}
              accent={theme.primary}
              theme={theme}
            />
            {notifMaster && (
              <>
                <RowDivider theme={theme} />
                <PlainToggleRow
                  icon="car"
                  label={t.settings.notifRides}
                  sub={t.settings.notifRidesSub}
                  checked={notifRides}
                  onChange={(v) => { setNotifRides(v); persistNotifPref('notif_rides', v, () => setNotifRides(!v)); }}
                  accent={theme.primary}
                  theme={theme}
                />
                <RowDivider theme={theme} />
                <PlainToggleRow
                  icon="package"
                  label={t.settings.notifPackages}
                  sub={t.settings.notifPackagesSub}
                  checked={notifPackages}
                  onChange={(v) => { setNotifPackages(v); persistNotifPref('notif_packages', v, () => setNotifPackages(!v)); }}
                  accent={theme.primary}
                  theme={theme}
                />
                <RowDivider theme={theme} />
                <PlainToggleRow
                  icon="truck"
                  label={t.settings.notifHauling}
                  sub={t.settings.notifHaulingSub}
                  checked={notifHauling}
                  onChange={(v) => { setNotifHauling(v); persistNotifPref('notif_hauling', v, () => setNotifHauling(!v)); }}
                  accent={theme.primary}
                  theme={theme}
                />
                <RowDivider theme={theme} />
                <PlainToggleRow
                  icon="chat"
                  label={t.settings.notifPostMessages}
                  sub={t.settings.notifPostMessagesSub}
                  checked={notifPostMessages}
                  onChange={(v) => { setNotifPostMessages(v); persistNotifPref('notif_post_messages', v, () => setNotifPostMessages(!v)); }}
                  accent={theme.primary}
                  theme={theme}
                />
                <RowDivider theme={theme} />
                <PlainToggleRow icon="event" label={t.settings.tripUpdates} sub={t.settings.tripUpdatesSub} checked={tripUpdates} onChange={setTripUpdates} accent={theme.primary} theme={theme} />
              </>
            )}
          </CardBox>
        </View>

        {/* Ride reminders */}
        <View style={{ gap: 10 }}>
          <Text style={sectionLabelStyle(theme)}>{t.settings.remindersTitle}</Text>
          <CardBox>
            <PlainToggleRow
              icon="notification"
              label={t.settings.remindersTitle}
              sub={t.settings.remindersSub}
              checked={remindersOn}
              onChange={(v) => { setRemindersOn(v); persistNotifPref('notif_reminders', v, () => setRemindersOn(!v)); }}
              accent={theme.primary}
              theme={theme}
            />
          </CardBox>
        </View>

        {/* About */}
        <TouchableOpacity
          onPress={() => router.push('/profile/about')}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface,
            borderWidth: 1, borderColor: theme.cardBorder, borderRadius: radii.md, padding: 14,
          }}
        >
          <Icon name="info" size={18} color={theme.muted} />
          <Text style={{ flex: 1, fontFamily: fonts.bodySemibold, fontSize: 14, color: theme.text }}>{t.settings.aboutTitle}</Text>
          <Icon name="chevron_right" size={16} color={theme.textFaint} />
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity
          onPress={() => setShowSignOutConfirm(true)}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            borderWidth: 1, borderColor: theme.danger + '66', borderRadius: radii.md, paddingVertical: 14,
          }}
        >
          <Icon name="logout" size={17} color={theme.danger} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.danger }}>{t.profile.signOut}</Text>
        </TouchableOpacity>
      </ScrollView>
      <ConfirmSheet
        visible={showSignOutConfirm}
        tone="danger"
        icon="logout"
        title={t.profile.signOutTitle}
        message={t.profile.signOutConfirm}
        confirmLabel={t.profile.exit}
        cancelLabel={t.profile.cancel}
        busy={signingOut}
        onConfirm={confirmSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </View>
  );
}

function sectionLabelStyle(theme: ReturnType<typeof useTheme>) {
  return {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: letterSpacingFor(11, tracking.wide),
    color: theme.textFaint,
  };
}
