import { useState, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Image, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useBadges } from '@/hooks/useBadges';
import { useVehicleProfile } from '@/hooks/useVehicleProfile';
import { PaywallModal } from '@/components/subscription/PaywallModal';
import { BadgeDisplay } from '@/components/community/BadgeDisplay';
import { EditVehicleModal } from '@/components/profile/EditVehicleModal';
import { VehicleDetailModal, AMENITY_LABELS } from '@/components/profile/VehicleDetailModal';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { PreferencesModal } from '@/components/profile/PreferencesModal';
import { AccountModal } from '@/components/profile/AccountModal';
import { RideHistoryModal } from '@/components/profile/RideHistoryModal';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { useLanguageStore } from '@/store/languageStore';
import { Icon } from '@/components/ui/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeCount, StrikeLevel, VehicleProfile } from '@/types';
import { IconName } from '@/constants/icons';

export default function ProfileScreen() {
  const { profile, session } = useAuthStore();
  const { signOut } = useAuth();
  const { isActive, isFree, planLabel } = useSubscription();
  const { getBadgeCounts, getStrikeLevel } = useBadges();
  const { getMyVehicle } = useVehicleProfile();

  const [badges, setBadges] = useState<BadgeCount[]>([]);
  const [strikeLevel, setStrikeLevel] = useState<StrikeLevel>(0);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleProfile | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [tripCount, setTripCount] = useState<number | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);

  // Modal visibility
  const [showVehicle, setShowVehicle] = useState(false);
  const [showVehicleDetail, setShowVehicleDetail] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [tooltipAmenity, setTooltipAmenity] = useState<string | null>(null);

  const t = useTranslation();
  const theme = useTheme();
  const { language } = useLanguageStore();
  const insets = useSafeAreaInsets();

  const userId = session?.user?.id ?? '';
  const email = session?.user?.email ?? '';

  const HERO_GRADIENT: [string, string] = ['#B8840A', '#E8C840'];
  const HERO_TEXT    = '#1A0D00';
  const HERO_SUBTEXT = 'rgba(26, 13, 0, 0.65)';


  useEffect(() => {
    if (userId) {
      loadCommunityData();
      loadVehicle();
      loadStats();
    }
  }, [userId]);

  async function loadCommunityData() {
    setCommunityLoading(true);
    try {
      const [b, s] = await Promise.all([getBadgeCounts(userId), getStrikeLevel(userId)]);
      setBadges(b);
      setStrikeLevel(s);
    } catch {} finally { setCommunityLoading(false); }
  }

  async function loadVehicle() {
    setVehicleLoading(true);
    try { setVehicle(await getMyVehicle(userId)); }
    catch {} finally { setVehicleLoading(false); }
  }

  async function loadStats() {
    try {
      const [tripsRes, postsRes] = await Promise.all([
        supabase
          .from('ride_agreements')
          .select('id', { count: 'exact', head: true })
          .or(`driver_id.eq.${userId},rider_id.eq.${userId}`)
          .eq('status', 'completed'),
        supabase
          .from('ride_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ]);
      setTripCount(tripsRes.count ?? 0);
      setPostCount(postsRes.count ?? 0);
    } catch {}
  }

  async function handleSignOut() {
    Alert.alert(t.profile.signOutTitle, t.profile.signOutConfirm, [
      { text: t.profile.cancel, style: 'cancel' },
      { text: t.profile.exit, style: 'destructive', onPress: signOut },
    ]);
  }

  const cardShadow = {
    shadowColor: theme.cardShadowColor as string,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.cardShadowOpacity,
    shadowRadius: 12,
    elevation: 6,
  };

  // ── Reusable settings row card ────────────────────────────────────────
  function SettingCard({
    icon, label, preview, onPress, danger = false,
  }: {
    icon: IconName;
    label: string;
    preview?: string;
    onPress: () => void;
    danger?: boolean;
  }) {
    const iconColor = danger ? theme.danger : theme.primary;
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: danger ? theme.danger + '30' : theme.border,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          marginBottom: 10,
          ...cardShadow,
        }}
      >
        <View style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: iconColor + '18',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={icon} size={19} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: danger ? theme.danger : theme.text, fontFamily: theme.fontDisplay, fontSize: 15 }}>
            {label}
          </Text>
          {preview ? (
            <Text style={{ color: theme.muted, fontSize: 12, marginTop: 1 }}>{preview}</Text>
          ) : null}
        </View>
        <Icon name="chevron_right" size={18} color={theme.muted} />
      </TouchableOpacity>
    );
  }

  // ── Section label ─────────────────────────────────────────────────────
  function SectionLabel({ text }: { text: string }) {
    return (
      <Text style={{
        color: theme.muted, fontSize: 11, fontFamily: theme.fontDisplay,
        letterSpacing: 1.2, textTransform: 'uppercase',
        marginBottom: 8, marginTop: 20,
      }}>
        {text}
      </Text>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>

      {/* ── Profile hero banner ─────────────────────────────────────────── */}
      <LinearGradient
        colors={HERO_GRADIENT}
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 32,
          alignItems: 'center',
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        {/* Settings button — top right */}
        <TouchableOpacity
          onPress={() => setShowPreferences(true)}
          activeOpacity={0.75}
          style={{
            position: 'absolute',
            top: insets.top + 12,
            right: 16,
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.12)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="settings" size={20} color={HERO_TEXT} />
        </TouchableOpacity>

        {/* Avatar */}
        <TouchableOpacity
          onPress={() => setShowEditProfile(true)}
          activeOpacity={0.85}
          style={{ marginBottom: 14 }}
        >
          <View style={{
            width: 96, height: 96, borderRadius: 48,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 10,
          }}>
            <View style={{
              width: 96, height: 96, borderRadius: 48, overflow: 'hidden',
              backgroundColor: HERO_TEXT,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 3,
              borderColor: 'rgba(255,255,255,0.7)',
            }}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={{ width: 96, height: 96 }} />
              ) : (
                <Text style={{ fontSize: 38, color: '#E8C840', fontFamily: theme.fontDisplay }}>
                  {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              )}
            </View>
          </View>

          {/* Camera badge */}
          <View style={{
            position: 'absolute', bottom: 2, right: 2,
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: '#E8C840',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 2.5,
            borderColor: HERO_TEXT,
          }}>
            <Icon name="camera" size={13} color={HERO_TEXT} />
          </View>
        </TouchableOpacity>

        {/* Full name */}
        <Text style={{
          fontSize: 22, color: HERO_TEXT,
          fontFamily: theme.fontDisplay,
        }}>
          {profile?.full_name}
        </Text>

        {/* @username */}
        {profile?.username ? (
          <Text style={{ color: HERO_SUBTEXT, fontSize: 13, marginTop: 3 }}>
            @{profile.username}
          </Text>
        ) : null}

        {/* Member since */}
        <Text style={{ color: HERO_SUBTEXT, fontSize: 12, marginTop: 4 }}>
          {t.profile.memberSince}{' '}
          {profile?.created_at
            ? new Date(profile.created_at).toLocaleDateString(t.locale, { month: 'long', year: 'numeric' })
            : '—'}
        </Text>

        {/* ── Stats row ────────────────────────────────────────────────── */}
        <View style={{
          flexDirection: 'row',
          marginTop: 18,
          marginHorizontal: 24,
          backgroundColor: 'rgba(0,0,0,0.16)',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          {/* Viajes realizados */}
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, gap: 5 }}>
            <Icon name="route" size={20} color={HERO_TEXT} />
            <Text style={{ fontSize: 20, fontFamily: theme.fontDisplay, color: HERO_TEXT, lineHeight: 22 }}>
              {tripCount === null ? '—' : tripCount}
            </Text>
            <Text style={{ fontSize: 10, color: HERO_SUBTEXT, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Viajes
            </Text>
          </View>

          {/* Divider */}
          <View style={{ width: 1, backgroundColor: 'rgba(26,13,0,0.18)', marginVertical: 12 }} />

          {/* Anuncios publicados */}
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, gap: 5 }}>
            <Icon name="pageinfo" size={20} color={HERO_TEXT} />
            <Text style={{ fontSize: 20, fontFamily: theme.fontDisplay, color: HERO_TEXT, lineHeight: 22 }}>
              {postCount === null ? '—' : postCount}
            </Text>
            <Text style={{ fontSize: 10, color: HERO_SUBTEXT, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Anuncios
            </Text>
          </View>

          {/* Divider */}
          <View style={{ width: 1, backgroundColor: 'rgba(26,13,0,0.18)', marginVertical: 12 }} />

          {/* Badges recibidos */}
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, gap: 5 }}>
            <Icon name="star" size={20} color={HERO_TEXT} />
            <Text style={{ fontSize: 20, fontFamily: theme.fontDisplay, color: HERO_TEXT, lineHeight: 22 }}>
              {communityLoading ? '—' : badges.reduce((s, b) => s + b.count, 0)}
            </Text>
            <Text style={{ fontSize: 10, color: HERO_SUBTEXT, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Badges
            </Text>
          </View>
        </View>

        {/* Community badges */}
        {!communityLoading && (badges.length > 0 || strikeLevel > 0) && (
          <View style={{ marginTop: 16, paddingHorizontal: 20, width: '100%' }}>
            <BadgeDisplay badges={badges} strikeLevel={strikeLevel} />
          </View>
        )}
        {communityLoading && (
          <ActivityIndicator
            size="small"
            color={HERO_TEXT}
            style={{ marginTop: 16 }}
          />
        )}
      </LinearGradient>

      {/* ── Vehicle card ─────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 }}>
        {vehicleLoading ? (
          <ActivityIndicator size="small" color={theme.primary} style={{ margin: 28 }} />
        ) : vehicle ? (
          // Shadow wrapper (split from overflow:hidden so shadows aren't clipped)
          <View style={{
            borderRadius: 20, backgroundColor: theme.surface,
            marginBottom: 12, ...cardShadow,
          }}>
            {/* Clip content to rounded corners */}
            <View style={{ borderRadius: 20, overflow: 'hidden' }}>

              {/* Vehicle photo */}
              {vehicle.photo_url ? (
                <Image
                  source={{ uri: vehicle.photo_url }}
                  style={{ width: '100%', height: 200 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{
                  width: '100%', height: 150,
                  backgroundColor: theme.surfaceAlt,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="car" size={56} color={theme.border} />
                </View>
              )}

              {/* Amenity icon grid — 4 columns */}
              {vehicle.amenities.length > 0 && (
                <View style={{
                  borderTopWidth: 1, borderTopColor: theme.border,
                  flexDirection: 'row', flexWrap: 'wrap',
                  paddingHorizontal: 8, paddingVertical: 18,
                }}>
                  {vehicle.amenities.filter(a => a in AMENITY_LABELS).map(a => {
                    const detail = vehicle.amenity_details?.[a as keyof typeof vehicle.amenity_details];
                    const hasDetail = detail && (detail.choices.length > 0 || detail.note.trim());
                    return (
                      <TouchableOpacity
                        key={a}
                        onPress={() => setTooltipAmenity(a)}
                        activeOpacity={0.7}
                        style={{ width: '25%', alignItems: 'center', paddingVertical: 8 }}
                      >
                        <View style={{
                          width: 54, height: 54, borderRadius: 27,
                          backgroundColor: theme.primary + '18',
                          borderWidth: 1.5,
                          borderColor: theme.primary + '45',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon name={a as IconName} size={24} color={theme.primary} />
                        </View>
                        {hasDetail && (
                          <View style={{
                            position: 'absolute', top: 6, right: '12%',
                            width: 8, height: 8, borderRadius: 4,
                            backgroundColor: theme.primary,
                          }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Amenity tooltip modal */}
              {tooltipAmenity && (() => {
                const detail = vehicle.amenity_details?.[tooltipAmenity as keyof typeof vehicle.amenity_details];
                const choiceText = detail?.choices.join(' / ') ?? '';
                const note = detail?.note.trim() ?? '';
                return (
                  <Modal transparent animationType="fade" visible onRequestClose={() => setTooltipAmenity(null)}>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' }}
                      onPress={() => setTooltipAmenity(null)}
                      activeOpacity={1}
                    >
                      <View style={{
                        backgroundColor: theme.surface, borderRadius: 16,
                        paddingHorizontal: 20, paddingVertical: 16,
                        maxWidth: 280, minWidth: 180,
                        borderWidth: 1, borderColor: theme.primary + '30',
                        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
                        gap: 4,
                      }}>
                        <Text style={{ color: theme.primary, fontFamily: theme.fontDisplay, fontSize: 14 }}>
                          {AMENITY_LABELS[tooltipAmenity as keyof typeof AMENITY_LABELS] ?? tooltipAmenity}
                        </Text>
                        {choiceText ? (
                          <Text style={{ color: theme.text, fontSize: 13, fontFamily: theme.fontBody }}>
                            {choiceText}
                          </Text>
                        ) : null}
                        {note ? (
                          <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: theme.fontBody, lineHeight: 18 }}>
                            {note}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  </Modal>
                );
              })()}

              {/* Tappable info row — opens extended detail modal */}
              <TouchableOpacity
                onPress={() => setShowVehicleDetail(true)}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderTopWidth: 1, borderTopColor: theme.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 15, fontFamily: theme.fontDisplay,
                    color: theme.text, textTransform: 'uppercase', letterSpacing: 1,
                  }}>
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 3 }}>
                    <Text style={{ fontSize: 12, color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {vehicle.color}
                    </Text>
                    {vehicle.trim && (
                      <Text style={{ fontSize: 12, color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {' · '}{vehicle.trim.toUpperCase()}
                      </Text>
                    )}
                    {vehicle.fuel_type && (
                      <Text style={{ fontSize: 12, color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {' · '}{vehicle.fuel_type.toUpperCase()}
                      </Text>
                    )}
                    {vehicle.seats && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>{' · '}</Text>
                        <Icon name="seat_recline" size={12} color={theme.muted} />
                        <Text style={{ fontSize: 12, color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}> {vehicle.seats}</Text>
                      </View>
                    )}
                    {vehicle.insurance_self_certified && (
                      <Text style={{ fontSize: 12, color: theme.success, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {' · '}✓ INSURED
                      </Text>
                    )}
                  </View>
                </View>
                <Icon name="chevron_right" size={18} color={theme.muted} />
              </TouchableOpacity>

              {/* Edit / info button — floating over top-right of photo */}
              <TouchableOpacity
                onPress={() => setShowVehicle(true)}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 38, height: 38, borderRadius: 19,
                  backgroundColor: theme.surface,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: theme.cardShadowColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: theme.cardShadowOpacity,
                  shadowRadius: 6,
                  elevation: 5,
                }}
              >
                <Icon name="pageinfo" size={20} color={theme.primary} />
              </TouchableOpacity>

            </View>
          </View>
        ) : (
          // No vehicle — add CTA
          <TouchableOpacity
            onPress={() => setShowVehicle(true)}
            style={{
              backgroundColor: theme.surface, borderRadius: 20,
              padding: 28, alignItems: 'center', gap: 12,
              marginBottom: 12, ...cardShadow,
            }}
          >
            <View style={{
              width: 60, height: 60, borderRadius: 18,
              backgroundColor: theme.primary + '15',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="car" size={30} color={theme.primary} />
            </View>
            <Text style={{ color: theme.primary, fontFamily: theme.fontDisplay, fontSize: 15 }}>
              {t.profile.addVehicle}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 13, textAlign: 'center' }}>
              Add your vehicle so riders know what to expect.
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Settings cards ───────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 48 }}>
        <SectionLabel text="Settings" />

        <SettingCard
          icon="badge"
          label="Community"
          preview={strikeLevel === 0 ? t.strikes.noStrikes : t.strikes[`level${strikeLevel}` as 'level1' | 'level2' | 'level3']}
          onPress={() => {}}
        />

        <SettingCard
          icon="verified"
          label={isActive ? t.profile.activeAccount : t.profile.freePlan}
          preview={planLabel}
          onPress={() => isFree ? setShowPaywall(true) : undefined}
        />

        <SettingCard
          icon="history"
          label={t.profile.rideHistorySection}
          preview={t.profile.viewRecord}
          onPress={() => setShowHistory(true)}
        />

        <SettingCard
          icon="key"
          label={t.profile.accountSection}
          preview={email}
          onPress={() => setShowAccount(true)}
        />

        {/* ── Sign out ── */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={{
            marginTop: 24,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            borderWidth: 1, borderColor: theme.danger + '50',
            borderRadius: 14, paddingVertical: 14,
          }}
        >
          <Icon name="logout" size={18} color={theme.danger} />
          <Text style={{ color: theme.danger, fontFamily: theme.fontDisplay, fontSize: 15 }}>
            {t.profile.signOut}
          </Text>
        </TouchableOpacity>

        {/* App version */}
        <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 20 }}>
          {t.profile.appVersion} 1.0.0
        </Text>
      </View>

      {/* ── Modals ── */}
      <EditProfileModal
        visible={showEditProfile}
        profile={profile}
        onClose={() => setShowEditProfile(false)}
      />
      <EditVehicleModal
        visible={showVehicle}
        userId={userId}
        existing={vehicle}
        onSaved={v => { setVehicle(v); setShowVehicle(false); }}
        onClose={() => setShowVehicle(false)}
      />
      {vehicle && (
        <VehicleDetailModal
          visible={showVehicleDetail}
          vehicle={vehicle}
          onClose={() => setShowVehicleDetail(false)}
          onEdit={() => setShowVehicle(true)}
        />
      )}
      <PreferencesModal
        visible={showPreferences}
        onClose={() => setShowPreferences(false)}
      />
      <AccountModal
        visible={showAccount}
        email={email}
        onClose={() => setShowAccount(false)}
      />
      <RideHistoryModal
        visible={showHistory}
        userId={userId}
        onClose={() => setShowHistory(false)}
      />
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </ScrollView>
  );
}
