import { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useBadges } from '@/hooks/useBadges';
import { useVehicleProfile } from '@/hooks/useVehicleProfile';
import { PaywallModal } from '@/components/subscription/PaywallModal';
import { EditVehicleModal } from '@/components/profile/EditVehicleModal';
import { PreferencesModal } from '@/components/profile/PreferencesModal';
import { RideHistoryModal } from '@/components/profile/RideHistoryModal';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { BadgeCount, StrikeLevel, VehicleProfile, VehicleKind, BadgeType } from '@/types';
import { IconName } from '@/constants/icons';
import { fonts, shadows } from '@/constants/themes';
import { tracking, leading, letterSpacingFor } from '@/constants/typography';

// The "STATS"-style card category label: font-body extrabold, tracking-wide,
// uppercase, text-faint — a distinct spec from the shared textStyles.eyebrow
// (bold + tracking-caps), so overridden locally rather than changing that
// shared token and risking every other eyebrow usage (header greeting, etc.)
const categoryLabelStyle = {
  fontFamily: fonts.bodyExtraBold,
  fontSize: 11,
  lineHeight: Math.round(11 * leading.tight),
  letterSpacing: letterSpacingFor(11, tracking.wide),
  textTransform: 'uppercase' as const,
};

// Icon + accent color per badge type — BadgeDisplay (community list) has no
// per-type icon convention yet, this is a new mapping just for this row.
const BADGE_ICONS: Record<BadgeType, { icon: IconName; color: string }> = {
  clean_car:     { icon: 'car',          color: '#0E9C93' },
  punctual:      { icon: 'schedule',     color: '#B8860B' },
  friendly:      { icon: 'handshake',    color: '#ED4A2B' },
  good_vibes:    { icon: 'music_ok',     color: '#D6409F' },
  smooth_ride:   { icon: 'route',        color: '#0A7E77' },
  on_time:       { icon: 'schedule',     color: '#B8860B' },
  communicative: { icon: 'chat',         color: '#08637A' },
  respectful:    { icon: 'handshake',    color: '#ED4A2B' },
  tidy:          { icon: 'check_circle', color: '#0A7E77' },
  great_company: { icon: 'star',         color: '#9E4A14' },
};

// Category label + bold title + optional subtitle + chevron — the settings-list
// row shape from the design. Card already gives it the press/shadow behavior.
function SettingRow({
  icon, iconColor, category, title, subtitle, onPress,
}: {
  icon: IconName;
  iconColor: string;
  category: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Card interactive onPress={onPress} padding={14} radius={16} elevation="lg" style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: iconColor + '18', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={21} color={iconColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...categoryLabelStyle, color: theme.textFaint }}>{category}</Text>
          <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 17, lineHeight: Math.round(17 * leading.tight), letterSpacing: letterSpacingFor(17, tracking.tight), color: theme.text, marginTop: 2 }}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, lineHeight: Math.round(12.5 * leading.tight), color: theme.muted, marginTop: 1 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Icon name="chevron_right" size={18} color={theme.muted} />
      </View>
    </Card>
  );
}

// The two vehicle slots — icon + category label, then the vehicle name or an
// "add" prompt. Matches the design's compact side-by-side vehicle cards.
function VehicleMiniCard({
  icon, label, vehicle, onPress,
}: {
  icon: IconName;
  label: string;
  vehicle: VehicleProfile | undefined;
  onPress: () => void;
}) {
  const theme = useTheme();
  const t = useTranslation();
  return (
    <Card interactive onPress={onPress} padding={12} radius={16} elevation="lg" pressedScale={0.95} style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: theme.driverSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={16} color={theme.driverText} />
        </View>
        <Text numberOfLines={1} style={{ ...categoryLabelStyle, fontSize: 10, lineHeight: Math.round(10 * leading.snug), letterSpacing: letterSpacingFor(10, 0.06), color: theme.driverText, flexShrink: 1 }}>
          {label}
        </Text>
      </View>
      <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 12, color: theme.text }}>
        {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : t.profile.tapToAddVehicle}
      </Text>
    </Card>
  );
}

export default function ProfileScreen() {
  const { profile, session } = useAuthStore();
  const { signOut } = useAuth();
  const { isActive, isFree, daysRemaining } = useSubscription();
  const { getBadgeCounts, getStrikeLevel } = useBadges();
  const { getMyVehicles } = useVehicleProfile();
  const t = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [badges, setBadges] = useState<BadgeCount[]>([]);
  const [strikeLevel, setStrikeLevel] = useState<StrikeLevel>(0);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [tripCount, setTripCount] = useState<number | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null);
  const [nextRideAt, setNextRideAt] = useState<string | null>(null);

  const [memberSinceWrapped, setMemberSinceWrapped] = useState(false);

  const [editingVehicleKind, setEditingVehicleKind] = useState<VehicleKind | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const userId = session?.user?.id ?? '';
  const verified = vehicles.some((v) => v.insurance_self_certified);
  const totalBadges = badges.reduce((s, b) => s + b.count, 0);

  useEffect(() => {
    if (userId) {
      loadCommunityData();
      loadVehicles();
      loadStats();
    }
  }, [userId]);

  // Re-measure from a fresh single-line attempt whenever the underlying text
  // changes (e.g. home_city edited shorter) — otherwise, once wrapped, it'd stay
  // wrapped forever since the wrapped render uses an explicit "\n" that always
  // reports 2 lines regardless of whether it'd now fit on one.
  useEffect(() => {
    setMemberSinceWrapped(false);
  }, [profile?.home_city, profile?.created_at]);

  async function loadCommunityData() {
    setCommunityLoading(true);
    try {
      const [b, s] = await Promise.all([getBadgeCounts(userId), getStrikeLevel(userId)]);
      setBadges(b);
      setStrikeLevel(s);
    } catch {} finally { setCommunityLoading(false); }
  }

  async function loadVehicles() {
    setVehicleLoading(true);
    try { setVehicles(await getMyVehicles(userId)); }
    catch {} finally { setVehicleLoading(false); }
  }

  async function loadStats() {
    try {
      const [tripsRes, postsRes, upcomingRes, nextRideRes] = await Promise.all([
        supabase
          .from('ride_agreements')
          .select('id', { count: 'exact', head: true })
          .or(`driver_id.eq.${userId},rider_id.eq.${userId}`)
          .eq('status', 'completed'),
        supabase
          .from('ride_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('ride_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'active')
          .gt('scheduled_at', new Date().toISOString()),
        supabase
          .from('ride_posts')
          .select('scheduled_at')
          .eq('user_id', userId)
          .eq('status', 'active')
          .gt('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      setTripCount(tripsRes.count ?? 0);
      setPostCount(postsRes.count ?? 0);
      setUpcomingCount(upcomingRes.count ?? 0);
      setNextRideAt(nextRideRes.data?.scheduled_at ?? null);
    } catch {}
  }

  async function handleSignOut() {
    Alert.alert(t.profile.signOutTitle, t.profile.signOutConfirm, [
      { text: t.profile.cancel, style: 'cancel' },
      { text: t.profile.exit, style: 'destructive', onPress: signOut },
    ]);
  }

  function comingSoon() {
    Alert.alert(t.profile.comingSoonTitle, t.profile.comingSoonMsg);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      {/* ── Fixed: hero + floating stats card, don't scroll — everything
          below this scrolls underneath in its own ScrollView. ─────────── */}
      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 46, paddingBottom: 40, alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, ...shadows.lg }}
      >
        {strikeLevel > 0 && (
          <View style={{ position: 'absolute', top: insets.top + 12, right: 72 }}>
            <IconButton
              icon="warning"
              variant="glass"
              shadow={shadows.xs}
              label={t.strikes[`level${strikeLevel}` as 'level1' | 'level2' | 'level3']}
              onPress={() => Alert.alert(
                t.strikes[`level${strikeLevel}` as 'level1' | 'level2' | 'level3'],
                strikeLevel === 3 ? t.strikes.level3Detail : t.strikes.strikeDetail
              )}
            />
            <View style={{
              position: 'absolute', top: -2, right: -2,
              width: 12, height: 12, borderRadius: 6,
              backgroundColor: strikeLevel === 3 ? theme.danger : theme.badgeWarnFg,
              borderWidth: 2, borderColor: theme.tabBarBg,
            }} />
          </View>
        )}
        <IconButton
          icon="settings"
          variant="glass"
          shadow={shadows.xs}
          label={t.profile.settingsLabel}
          onPress={() => setShowPreferences(true)}
          style={{ position: 'absolute', top: insets.top + 12, right: 20 }}
        />

        <TouchableOpacity onPress={() => router.push('/profile/edit')} activeOpacity={0.85} style={{ marginBottom: 8, marginTop: 8 }}>
          <View style={{ padding: 3, borderRadius: 51, backgroundColor: 'rgba(255,255,255,0.9)', ...shadows.md }}>
            <Avatar
              name={profile?.full_name ?? ''}
              src={profile?.avatar_url}
              photo={!!profile?.avatar_url}
              icon={!profile?.avatar_url ? 'person' : undefined}
              size={90}
              verified={verified}
            />
          </View>
          <View style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 30, height: 30, borderRadius: 15,
            backgroundColor: theme.secondary,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 2.5, borderColor: theme.tabBarBg,
          }}>
            <Icon name="camera" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <Text style={{ fontFamily: fonts.displayBold, fontSize: 27, letterSpacing: letterSpacingFor(27, tracking.tight), color: theme.cream, marginTop: 10 }}>{profile?.full_name}</Text>
        <Text
          style={{
            fontFamily: fonts.bodyRegular,
            fontSize: 12.5,
            textTransform: 'uppercase',
            letterSpacing: letterSpacingFor(12.5, tracking.wide),
            color: 'rgba(255,255,255,0.88)',
            marginTop: 0,
            textAlign: 'center',
          }}
          onTextLayout={(e) => setMemberSinceWrapped(e.nativeEvent.lines.length > 1)}
        >
          {profile?.home_city ? `${profile.home_city}${memberSinceWrapped ? '\n' : ' • '}` : ''}
          {t.profile.memberSince}{' '}
          {profile?.created_at
            ? new Date(profile.created_at).toLocaleDateString(t.locale, { month: 'long', year: 'numeric' })
            : '—'}
        </Text>
      </LinearGradient>

      {/* ── Floating stats card ─────────────────────────────────────────── */}
      <View style={{ marginTop: -32, marginHorizontal: 20, zIndex: 10, elevation: 10 }}>
        <Card padding={14} radius={20} elevation="lg">
          <View style={{ flexDirection: 'row' }}>
            {[
              { value: tripCount, label: t.profile.statTrips },
              { value: postCount, label: t.profile.statPosts },
              { value: communityLoading ? null : totalBadges, label: t.profile.statBadges },
            ].map((s, i) => (
              <View key={s.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                {i > 0 && <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: theme.cardBorder }} />}
                {/* minHeight:44 matches the icon-square height that drives
                    SettingRow's card height — same outer Card padding (14) +
                    same content-box height (44) = identical total card height. */}
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
                  <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: 23, color: theme.text }}>
                    {s.value === null ? '—' : s.value}
                  </Text>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11.5, 0.06), color: theme.textFaint }}>{s.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </View>

      {/* ── Everything below scrolls; the hero + stats card above stay put.
          The stats card's marginTop:-32 only shifts IT visually — it doesn't
          "compress" the flow the way a negative margin would on the web, so
          without a matching -32 here this View still starts flush with where
          the card WOULD be without that offset, leaving a 32px gap above it.
          Same -32 here closes that gap; paddingTop below is the real spacing
          from the card's visual bottom edge. ───────────────────────────── */}
      <View style={{ flex: 1, marginTop: -55 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* ── Subscriber promo card ───────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, paddingTop: 74 }}>
          <Card
            interactive
            onPress={() => isFree ? setShowPaywall(true) : undefined}
            padding={14}
            radius={16}
            elevation="lg"
            backgroundColor="#1C1410"
            borderColor={theme.borderGold}
            // Same shadows.lg offset/opacity/radius/elevation as every other
            // card — only shadowColor is overridden. The default dark navy
            // shadow blends into this card's own near-black fill and reads as
            // "no shadow"; a warm gold tint (already used for CTA glows
            // elsewhere) stays visible against a dark surface.
            style={{ marginBottom: 20, shadowColor: shadows.gold.shadowColor }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, overflow: 'hidden' }}>
                <LinearGradient colors={theme.gradientGold as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="star" size={21} color={theme.textOnPrimary} />
                </LinearGradient>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ ...categoryLabelStyle, color: theme.gold300 }}>{t.profile.membershipCategory}</Text>
                <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 17, lineHeight: Math.round(17 * leading.tight), letterSpacing: letterSpacingFor(17, tracking.tight), color: '#FFFFFF', marginTop: 2 }}>
                  {isActive ? t.profile.subscriberTitle : t.profile.freeTitle}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, lineHeight: Math.round(12.5 * leading.tight), color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
                  {isActive
                    ? (daysRemaining != null ? `${daysRemaining} ${t.profile.daysRemaining}` : t.profile.subscriberSubtitleActive)
                    : t.profile.subscriberSubtitleFree}
                </Text>
              </View>
              <Icon name="chevron_right" size={18} color="rgba(255,255,255,0.6)" />
            </View>
          </Card>
      </View>

      {/* ── Settings cards ───────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <SettingRow
          icon="pageinfo"
          iconColor="#B8860B"
          category={t.profile.statsCategory}
          title={t.profile.statsDashboard}
          subtitle={t.profile.statsDashboardSubtitle}
          onPress={comingSoon}
        />
        <SettingRow
          icon="history"
          iconColor={theme.primary}
          category={t.profile.rideHistoryCategory}
          title={tripCount === null ? '—' : `${tripCount} ${t.profile.tripsCompletedSuffix}`}
          subtitle={`${t.profile.memberSince} ${profile?.created_at ? new Date(profile.created_at).toLocaleDateString(t.locale, { month: 'short', year: 'numeric' }) : '—'}`}
          onPress={() => setShowHistory(true)}
        />
        <SettingRow
          icon="passenger"
          iconColor={theme.secondary}
          category={t.profile.trustedCategory}
          title={t.profile.savedDrivers}
          subtitle={t.profile.savedDriversSubtitle}
          onPress={comingSoon}
        />
        <SettingRow
          icon="event"
          iconColor="#ED4A2B"
          category={t.profile.scheduleCategory}
          title={upcomingCount === null ? '—' : upcomingCount === 0 ? t.profile.noUpcomingRides : `${upcomingCount} ${t.profile.upcomingRidesSuffix}`}
          subtitle={nextRideAt ? `${t.profile.nextRidePrefix} ${new Date(nextRideAt).toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })}, ${new Date(nextRideAt).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}` : undefined}
          onPress={comingSoon}
        />
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <VehicleMiniCard
            icon="car"
            label={t.profile.ridesCourierCategory}
            vehicle={vehicles.find((v) => v.kind === 'rides_courier')}
            onPress={() => setEditingVehicleKind('rides_courier')}
          />
          <VehicleMiniCard
            icon="truck"
            label={t.profile.haulingCategory}
            vehicle={vehicles.find((v) => v.kind === 'hauling')}
            onPress={() => setEditingVehicleKind('hauling')}
          />
        </View>
        <SettingRow
          icon="accessible"
          iconColor="#B8860B"
          category={t.profile.accessibilityCategory}
          title={t.profile.accessibilityTitle}
          subtitle={t.profile.accessibilitySubtitle}
          onPress={comingSoon}
        />
        {vehicleLoading && <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 12 }} />}

        {/* ── Community badges ─────────────────────────────────────────── */}
        {!communityLoading && totalBadges > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: theme.text, marginBottom: 12 }}>
              {t.profile.communityBadgesTitle}
            </Text>
            <View style={{ flexDirection: 'row', gap: 14, marginBottom: 10 }}>
              {badges.filter((b) => b.count > 0).map((b) => {
                const cfg = BADGE_ICONS[b.badge_type];
                return (
                  <TouchableOpacity key={b.badge_type} activeOpacity={0.7} onPress={comingSoon}>
                    <View style={{
                      width: 48, height: 48, borderRadius: 14,
                      backgroundColor: cfg.color + '18',
                      borderWidth: 1.5, borderColor: cfg.color + '45',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={cfg.icon} size={22} color={cfg.color} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.muted, lineHeight: 17 }}>
              {t.profile.communityBadgesCaption}
            </Text>
          </View>
        )}

        {/* ── Sign out ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={{
            marginTop: 12,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            borderRadius: 14, paddingVertical: 14,
          }}
        >
          <Icon name="logout" size={18} color={theme.danger} />
          <Text style={{ color: theme.danger, fontFamily: fonts.bodyBold, fontSize: 14 }}>
            {t.profile.signOut}
          </Text>
        </TouchableOpacity>

        <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 16 }}>
          {t.profile.appVersion} 1.0.0
        </Text>
        </View>
        </ScrollView>
      </View>

      {/* ── Modals ── */}
      <EditVehicleModal
        visible={editingVehicleKind !== null}
        userId={userId}
        kind={editingVehicleKind ?? 'rides_courier'}
        existing={vehicles.find((v) => v.kind === editingVehicleKind) ?? null}
        onSaved={(v) => {
          setVehicles((prev) => [...prev.filter((p) => p.kind !== v.kind), v]);
          setEditingVehicleKind(null);
        }}
        onClose={() => setEditingVehicleKind(null)}
      />
      <PreferencesModal visible={showPreferences} onClose={() => setShowPreferences(false)} />
      <RideHistoryModal visible={showHistory} userId={userId} onClose={() => setShowHistory(false)} />
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </View>
  );
}
