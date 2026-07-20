import { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
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
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguageStore } from '@/store/languageStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';

const MATCH_THRESHOLDS = [50, 70, 80, 100];

// Ported from ui_kits/ridemate-app/Settings.jsx. Language is the only piece
// backed by a real store (useLanguageStore) — notifications/reminders/match
// threshold have no push infrastructure behind them anywhere in this app
// yet, so they're UI-only local state, same scoping as the Calendar tab's
// Reminders panel.
export default function SettingsScreen() {
  const { signOut } = useAuth();
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useLanguageStore();

  const [trustedFirst, setTrustedFirst] = useState(false);
  const [notifMaster, setNotifMaster] = useState(true);
  const [notifRides, setNotifRides] = useState(true);
  const [notifPackages, setNotifPackages] = useState(true);
  const [notifHauling, setNotifHauling] = useState(true);
  const [matchThreshold, setMatchThreshold] = useState(70);
  const [tripUpdates, setTripUpdates] = useState(true);
  const [remindersOn, setRemindersOn] = useState(false);

  function handleSignOut() {
    Alert.alert(t.profile.signOutTitle, t.profile.signOutConfirm, [
      { text: t.profile.cancel, style: 'cancel' },
      { text: t.profile.exit, style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg }}
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
          <CardBox>
            <PlainToggleRow
              icon="passenger"
              label={t.settings.trustedFirst}
              sub={t.settings.trustedFirstSub}
              checked={trustedFirst}
              onChange={setTrustedFirst}
              accent={theme.primary}
              theme={theme}
            />
          </CardBox>
        </View>

        {/* Notifications */}
        <View style={{ gap: 10 }}>
          <Text style={sectionLabelStyle(theme)}>{t.settings.notificationsTitle}</Text>
          <CardBox>
            <PlainToggleRow icon="notification" label={t.settings.notifMaster} checked={notifMaster} onChange={setNotifMaster} accent={theme.primary} theme={theme} />
            {notifMaster && (
              <>
                <RowDivider theme={theme} />
                <PlainToggleRow icon="car" label={t.settings.notifRides} checked={notifRides} onChange={setNotifRides} accent={theme.primary} theme={theme} />
                <RowDivider theme={theme} />
                <PlainToggleRow icon="package" label={t.settings.notifPackages} checked={notifPackages} onChange={setNotifPackages} accent={theme.primary} theme={theme} />
                <RowDivider theme={theme} />
                <PlainToggleRow icon="truck" label={t.settings.notifHauling} checked={notifHauling} onChange={setNotifHauling} accent={theme.primary} theme={theme} />
                <RowDivider theme={theme} />
                <PlainToggleRow icon="event" label={t.settings.tripUpdates} sub={t.settings.tripUpdatesSub} checked={tripUpdates} onChange={setTripUpdates} accent={theme.primary} theme={theme} />
              </>
            )}
          </CardBox>
          {notifMaster && (
            <View>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: theme.text, marginBottom: 4 }}>{t.settings.matchThreshold}</Text>
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.muted, marginBottom: 10 }}>{t.settings.matchThresholdSub}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {MATCH_THRESHOLDS.map((pct) => (
                  <TouchableOpacity
                    key={pct}
                    onPress={() => setMatchThreshold(pct)}
                    style={{
                      flex: 1, height: 36, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: matchThreshold === pct ? theme.primary : theme.surfaceAlt,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: matchThreshold === pct ? '#fff' : theme.muted }}>{pct}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Ride reminders */}
        <View style={{ gap: 10 }}>
          <Text style={sectionLabelStyle(theme)}>{t.settings.remindersTitle}</Text>
          <CardBox>
            <PlainToggleRow icon="notification" label={t.settings.remindersTitle} sub={t.settings.remindersSub} checked={remindersOn} onChange={setRemindersOn} accent={theme.primary} theme={theme} />
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
          onPress={handleSignOut}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            borderWidth: 1, borderColor: theme.danger + '66', borderRadius: radii.md, paddingVertical: 14,
          }}
        >
          <Icon name="logout" size={17} color={theme.danger} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.danger }}>{t.profile.signOut}</Text>
        </TouchableOpacity>
      </ScrollView>
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
