import { useEffect, useState } from 'react';
import { View, ScrollView, Modal, Pressable as RNPressable, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useVehicleProfile } from '@/hooks/useVehicleProfile';
import { useBadges } from '@/hooks/useBadges';
import { useRides } from '@/hooks/useRides';
import { useUserReports } from '@/hooks/useUserReports';
import { useCommunitySummary } from '@/hooks/useCommunitySummary';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Profile, VehicleProfile, BadgeCount, RidePost } from '@/types';
import { BADGE_ICONS } from '@/constants/badgeIcons';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';

// Public user-profile screen — shown when tapping a post creator's avatar/
// name (see RideCard.tsx). Ported from ui_kits/ridemate-app/UserProfile.jsx;
// the design's "tier ring" and hardcoded mock badges/posts have no real
// backing and are left out. "Message" is deliberately NOT a generic button
// here (unlike the mock) — this app's conversations always anchor to a
// specific post, so messaging happens from a post's own detail screen via
// the "Active posts" list below, not from a bare profile.
export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const { getPublicProfile, getCompletedTripCount } = usePublicProfile();
  const { getMyVehicles } = useVehicleProfile();
  const { getBadgeCounts } = useBadges();
  const { getPostsByUser } = useRides();
  const { createReport, loading: reporting } = useUserReports();
  const { getCommunitySummary } = useCommunitySummary();
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([]);
  const [badges, setBadges] = useState<BadgeCount[]>([]);
  const [posts, setPosts] = useState<RidePost[]>([]);
  const [tripCount, setTripCount] = useState<number | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    // Tapping your own avatar goes to your real, editable profile (the "You"
    // tab) instead of this read-only public view of yourself.
    if (session?.user?.id === id) {
      router.replace('/(tabs)/profile');
      return;
    }
    load();
  }, [id, session?.user?.id]);

  async function load() {
    setLoading(true);
    try {
      const [p, v, b, ps, trips] = await Promise.all([
        getPublicProfile(id),
        getMyVehicles(id),
        getBadgeCounts(id),
        getPostsByUser(id),
        getCompletedTripCount(id),
      ]);
      setProfile(p);
      setVehicles(v);
      setBadges(b);
      setPosts(ps);
      setTripCount(trips);
      if (p) getCommunitySummary(p.full_name, b).then(setSummary);
    } catch {
      Alert.alert(t.rideDetail.errorTitle, t.userProfile.loadError);
    } finally {
      setLoading(false);
    }
  }

  const verified = vehicles.some((v) => v.insurance_self_certified);
  const totalBadges = badges.reduce((sum, b) => sum + b.count, 0);
  const activeBadges = badges.filter((b) => b.count > 0);
  const isSelf = session?.user?.id === id;

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 22, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {t.userProfile.title}
          </Text>
          {isSelf ? (
            <View style={{ width: 44 }} />
          ) : (
            <IconButton icon="report" variant="glass" label={t.userProfile.reportLabel} onPress={() => setReportOpen(true)} />
          )}
        </View>

        <View style={{ alignItems: 'center', marginTop: 14 }}>
          <View style={{ width: 78, height: 78 }}>
            <View style={{
              position: 'absolute', top: -3, left: -3, right: -3, bottom: -3,
              borderRadius: 42, borderWidth: 3, borderColor: 'rgba(20,12,6,0.4)',
            }} />
            <Avatar name={profile.full_name} src={profile.avatar_url} size={78} verified={verified} />
          </View>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, letterSpacing: letterSpacingFor(22, tracking.tight), color: theme.cream, marginTop: 10 }}>
            {profile.full_name}
          </Text>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, textTransform: 'uppercase', letterSpacing: letterSpacingFor(12, tracking.wide), color: theme.gold300, marginTop: 2 }}>
            {t.profile.memberSince} {new Date(profile.created_at).toLocaleDateString(t.locale, { month: 'long', year: 'numeric' })}
          </Text>

          <View style={{
            flexDirection: 'row', backgroundColor: theme.surface, borderRadius: radii.md,
            borderWidth: 1, borderColor: theme.cardBorder, overflow: 'hidden', width: '100%', maxWidth: 240, marginTop: 16, ...shadows.md,
          }}>
            {[
              { value: tripCount ?? 0, label: t.userProfile.trips },
              { value: totalBadges, label: t.userProfile.badges },
            ].map((s, i) => (
              <View key={s.label} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: theme.cardBorder }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: theme.text }}>{s.value}</Text>
                <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: letterSpacingFor(10.5, tracking.wide), color: theme.textFaint, marginTop: 2 }}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 20 }}>
        {vehicles.length > 0 && (
          <View>
            <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, color: theme.text, marginBottom: 10 }}>
              {vehicles.length > 1 ? t.userProfile.vehiclesSection : t.userProfile.vehicleSection}
            </Text>
            <View style={{ gap: 10 }}>
              {vehicles.map((v) => (
                <Card key={v.id} padding={12} radius={radii.lg} elevation="sm">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.driverSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="car" size={21} color={theme.driverText} />
                    </View>
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 14.5, color: theme.text }}>
                      {v.year} {v.make} {v.model}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {profile.bio && (
          <Card padding={16} radius={radii.lg} elevation="sm">
            <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: theme.textFaint, marginBottom: 8 }}>
              {t.userProfile.aboutSection}
            </Text>
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.textSecondary, lineHeight: 20 }}>
              {profile.bio}
            </Text>
          </Card>
        )}

        {activeBadges.length > 0 && (
          <View>
            <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, color: theme.text, marginBottom: 10 }}>
              {t.profile.communityBadgesTitle}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 10 }}>
              {activeBadges.map((b) => {
                const cfg = BADGE_ICONS[b.badge_type];
                return (
                  <View key={b.badge_type} style={{
                    width: 48, height: 48, borderRadius: 14,
                    backgroundColor: cfg.color + '18', borderWidth: 1.5, borderColor: cfg.color + '45',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={cfg.icon} size={22} color={cfg.color} />
                  </View>
                );
              })}
            </View>
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.muted, lineHeight: 17 }}>
              {t.profile.communityBadgesCaption}
            </Text>
          </View>
        )}

        {summary && (
          <Card padding={16} radius={radii.lg} elevation="sm" borderColor={theme.borderGold}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={{ width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <LinearGradient colors={theme.gradientGold as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
                <Icon name="brain" size={14} color={theme.textOnPrimary} />
              </View>
              <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: theme.textFaint }}>
                {t.userProfile.communitySummaryTitle}
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.textSecondary, lineHeight: 20 }}>
              {summary}
            </Text>
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint, marginTop: 8 }}>
              {t.userProfile.communitySummaryDisclaimer}
            </Text>
          </Card>
        )}

        {posts.length > 0 && (
          <View>
            <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, color: theme.text, marginBottom: 10 }}>
              {t.userProfile.activePostsSection}
            </Text>
            <View style={{ gap: 10 }}>
              {posts.map((p) => {
                const isOffer = p.type === 'offer';
                const pathname = p.kind === 'package' ? '/package/[id]' : p.kind === 'hauling' ? '/hauling/[id]' : '/ride/[id]';
                const accent = isOffer ? theme.driverText : theme.passengerText;
                return (
                  <Card key={p.id} interactive onPress={() => router.push({ pathname, params: { id: p.id } })} padding={14} radius={radii.lg} elevation="sm" accent={accent}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: accent }}>
                        {isOffer ? t.userProfile.postTypeOffer : t.userProfile.postTypeRequest}
                      </Text>
                      <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint }}>
                        {new Date(p.scheduled_at).toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: theme.text }}>{p.origin_city}</Text>
                      <Icon name="arrow_forward" size={14} color={theme.textFaint} />
                      <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: theme.text }}>{p.destination_city}</Text>
                    </View>
                    {p.suggested_donation != null && (
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: accent, marginTop: 5 }}>
                        {p.price_mode === 'firm' ? `$${p.suggested_donation}` : `$${p.suggested_donation} OBO`}
                      </Text>
                    )}
                  </Card>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <ReportSheet
        visible={reportOpen}
        userName={profile.full_name}
        busy={reporting}
        theme={theme}
        t={t}
        onCancel={() => setReportOpen(false)}
        onSubmit={async (reasons, note) => {
          if (!session?.user) return;
          try {
            await createReport(session.user.id, id, reasons, note);
            return true;
          } catch {
            Alert.alert(t.rideDetail.errorTitle, t.userProfile.reportError);
            return false;
          }
        }}
      />
    </View>
  );
}

// Plain RN Pressable throughout (not the shared gesture-handler
// TouchableOpacity) — the established fix for touchables going dead (or
// freezing the whole app after one open/close cycle) inside a plain Modal.
function ReportSheet({
  visible, userName, busy, theme, t, onCancel, onSubmit,
}: {
  visible: boolean;
  userName: string;
  busy: boolean;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useTranslation>;
  onCancel: () => void;
  onSubmit: (reasons: string[], note: string) => Promise<boolean | undefined>;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'form' | 'thanks'>('form');
  const [reasons, setReasons] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');

  function toggle(r: string) {
    setReasons((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  function reset() {
    setStep('form');
    setReasons(new Set());
    setNote('');
  }

  async function handleSubmit() {
    const ok = await onSubmit(Array.from(reasons), note);
    if (ok) setStep('thanks');
  }

  function handleClose() {
    onCancel();
    setTimeout(reset, 300);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <RNPressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={handleClose}>
        <RNPressable onPress={() => {}}>
          <View style={{
            position: 'relative',
            backgroundColor: theme.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
            padding: 22, paddingBottom: insets.bottom + 22,
          }}>
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: -40, height: 40, backgroundColor: theme.surface }} />
            <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 20 }} />

            {step === 'thanks' ? (
              <View style={{ alignItems: 'center', gap: 14 }}>
                <View style={{
                  width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: theme.driverText,
                  backgroundColor: theme.driverText + '18', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="check" size={28} color={theme.driverText} />
                </View>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: theme.text, textAlign: 'center' }}>
                  {t.userProfile.reportThanksTitle}
                </Text>
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.muted, textAlign: 'center', lineHeight: 20 }}>
                  {t.userProfile.reportThanksMsg}
                </Text>
                <Button variant="primary" size="lg" fullWidth style={{ marginTop: 8 }} onPress={handleClose}>
                  {t.userProfile.reportThanksButton}
                </Button>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.danger + '18', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="report" size={20} color={theme.danger} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: theme.text }}>{t.userProfile.reportTitle}</Text>
                    <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.muted, marginTop: 2 }}>
                      {t.userProfile.reportSubtitlePrefix} {userName}
                    </Text>
                  </View>
                </View>

                <View style={{ borderRadius: radii.lg, backgroundColor: theme.surfaceAlt, overflow: 'hidden', marginBottom: 14 }}>
                  {t.userProfile.reportReasons.map((r, i) => {
                    const checked = reasons.has(r);
                    return (
                      <RNPressable
                        key={r}
                        onPress={() => toggle(r)}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13,
                          borderTopWidth: i > 0 ? 1 : 0, borderTopColor: theme.cardBorder,
                        }}
                      >
                        <View style={{
                          width: 22, height: 22, borderRadius: 7,
                          borderWidth: checked ? 0 : 1.5, borderColor: theme.border,
                          backgroundColor: checked ? theme.danger : 'transparent',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          {checked && <Icon name="check" size={13} color="#fff" />}
                        </View>
                        <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: checked ? theme.text : theme.muted }}>
                          {r}
                        </Text>
                      </RNPressable>
                    );
                  })}
                </View>

                <View style={{ marginBottom: 18 }}>
                  <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: theme.textFaint, marginBottom: 8 }}>
                    {t.userProfile.reportNotesLabel}
                  </Text>
                  <Input
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={3}
                    placeholder={t.userProfile.reportNotesPlaceholder}
                  />
                </View>

                <View style={{ gap: 10 }}>
                  <Button variant="danger" size="lg" fullWidth disabled={reasons.size === 0 || busy} onPress={handleSubmit}>
                    {t.userProfile.reportSubmit}
                  </Button>
                  <Button variant="outline" size="lg" fullWidth onPress={handleClose}>
                    {t.userProfile.reportCancel}
                  </Button>
                </View>
              </>
            )}
          </View>
        </RNPressable>
      </RNPressable>
    </Modal>
  );
}
