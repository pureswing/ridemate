import { useEffect, useState } from 'react';
import { View, ScrollView, Modal, Pressable as RNPressable, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { useFavorites } from '@/hooks/useFavorites';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserFavorite } from '@/types';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';

const CITY_LIMIT = 5; // matches supabase/migrations/002_community_features.sql's enforce_favorites_limit trigger

export default function SavedDriversScreen() {
  const { session } = useAuthStore();
  const { getFavorites, removeFavorite, loading: removing } = useFavorites();
  const { getCompletedTripCount } = usePublicProfile();
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  const [favorites, setFavorites] = useState<UserFavorite[]>([]);
  const [insured, setInsured] = useState<Record<string, boolean>>({});
  const [tripCounts, setTripCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState<string>('__all__');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [activeDriver, setActiveDriver] = useState<UserFavorite | null>(null);
  const [removeTarget, setRemoveTarget] = useState<UserFavorite | null>(null);

  useEffect(() => {
    if (session?.user) load();
  }, [session?.user?.id]);

  async function load() {
    setLoading(true);
    try {
      const list = await getFavorites();
      setFavorites(list);
      const driverIds = Array.from(new Set(list.map((f) => f.driver_id)));
      if (driverIds.length > 0) {
        const [{ data: vehicles }, tripsList] = await Promise.all([
          supabase.from('vehicle_profiles').select('user_id, insurance_self_certified').in('user_id', driverIds),
          Promise.all(driverIds.map(async (id) => [id, await getCompletedTripCount(id)] as const)),
        ]);
        const insuredMap: Record<string, boolean> = {};
        for (const v of vehicles ?? []) {
          if (v.insurance_self_certified) insuredMap[v.user_id] = true;
        }
        setInsured(insuredMap);
        setTripCounts(Object.fromEntries(tripsList));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    try {
      await removeFavorite(removeTarget.driver_id);
      setFavorites((prev) => prev.filter((f) => f.driver_id !== removeTarget.driver_id));
      setRemoveTarget(null);
    } catch (e: any) {
      Alert.alert(t.rideDetail.errorTitle, e.message);
    }
  }

  const cities = Array.from(new Set(favorites.map((f) => f.city))).sort();
  const filtered = cityFilter === '__all__' ? favorites : favorites.filter((f) => f.city === cityFilter);
  const countInFilterCity = cityFilter === '__all__' ? 0 : favorites.filter((f) => f.city === cityFilter).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 16, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {t.savedDriversScreen.title}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingHorizontal: 16 }}>
          <TouchableOpacityChip onPress={() => setShowCityPicker(true)} theme={theme}>
            <Icon name="location" size={13} color={theme.gold300} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: theme.cream }}>
              {cityFilter === '__all__' ? t.savedDriversScreen.allCities : cityFilter}
            </Text>
            <Icon name="chevron_down" size={13} color="rgba(255,255,255,0.5)" />
          </TouchableOpacityChip>
          <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            {filtered.length} {filtered.length === 1 ? t.savedDriversScreen.driverSuffix : t.savedDriversScreen.driversSuffix}
            {cityFilter !== '__all__' && (
              <Text style={{ fontFamily: fonts.bodyBold, color: theme.gold400 }}>
                {' '}({countInFilterCity}/{CITY_LIMIT} {t.savedDriversScreen.slotsSuffix})
              </Text>
            )}
          </Text>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.primary} />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}>
          {filtered.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 14 }}>
              <Icon name="passenger" size={40} color={theme.textFaint} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: theme.text }}>
                  {cityFilter === '__all__' ? t.savedDriversScreen.emptyTitlePrefix : `${t.savedDriversScreen.emptyTitlePrefix} ${cityFilter}`}
                </Text>
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: theme.muted, marginTop: 6, textAlign: 'center', paddingHorizontal: 24 }}>
                  {t.savedDriversScreen.emptySubtitle}
                </Text>
              </View>
            </View>
          ) : (
            filtered.map((f) => (
              <Card key={f.id} interactive onPress={() => setActiveDriver(f)} padding={14} radius={radii.lg} elevation="sm" accent={theme.driverText}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Avatar name={f.driver?.full_name ?? '?'} src={f.driver?.avatar_url} size={48} verified={insured[f.driver_id] ?? false} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 15, color: theme.text }}>
                      {f.driver?.full_name ?? '—'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Icon name="location" size={11} color={theme.textFaint} />
                        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.textFaint }}>{f.city}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Icon name="car" size={11} color={theme.textFaint} />
                        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.textFaint }}>
                          {tripCounts[f.driver_id] ?? 0} {t.profile.tripsCompletedSuffix}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      )}

      {/* City picker */}
      <Modal visible={showCityPicker} transparent animationType="slide" onRequestClose={() => setShowCityPicker(false)}>
        <RNPressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={() => setShowCityPicker(false)}>
          <RNPressable onPress={() => {}}>
            <View style={{ position: 'relative', backgroundColor: theme.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: 22, paddingBottom: insets.bottom + 22 }}>
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: -40, height: 40, backgroundColor: theme.surface }} />
              <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 18 }} />
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: theme.text, marginBottom: 14 }}>
                {t.savedDriversScreen.filterByCity}
              </Text>
              {['__all__', ...cities].map((city) => {
                const active = cityFilter === city;
                const label = city === '__all__' ? t.savedDriversScreen.allCities : city;
                const count = city === '__all__' ? favorites.length : favorites.filter((f) => f.city === city).length;
                return (
                  <RNPressable
                    key={city}
                    onPress={() => { setCityFilter(city); setShowCityPicker(false); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingVertical: 13, paddingHorizontal: 10, borderRadius: radii.md,
                      backgroundColor: active ? theme.driverSoft : 'transparent',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Icon name="location" size={15} color={active ? theme.driverText : theme.textFaint} />
                      <Text style={{ fontFamily: active ? fonts.bodyExtraBold : fonts.bodySemibold, fontSize: 15, color: active ? theme.driverText : theme.text }}>
                        {label}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: active ? theme.driverText : theme.textFaint }}>{count}</Text>
                  </RNPressable>
                );
              })}
            </View>
          </RNPressable>
        </RNPressable>
      </Modal>

      {/* Driver actions */}
      <Modal visible={!!activeDriver} transparent animationType="slide" onRequestClose={() => setActiveDriver(null)}>
        <RNPressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={() => setActiveDriver(null)}>
          <RNPressable onPress={() => {}}>
            <View style={{ position: 'relative', backgroundColor: theme.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: 22, paddingBottom: insets.bottom + 22 }}>
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: -40, height: 40, backgroundColor: theme.surface }} />
              <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 18 }} />
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: theme.text, marginBottom: 12 }}>
                {activeDriver?.driver?.full_name}
              </Text>
              <RNPressable
                onPress={() => { const d = activeDriver!.driver_id; setActiveDriver(null); router.push({ pathname: '/user/[id]', params: { id: d } }); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }}
              >
                <Icon name="person" size={17} color={theme.text} />
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: theme.text }}>{t.savedDriversScreen.viewProfile}</Text>
              </RNPressable>
              <RNPressable
                onPress={() => { setRemoveTarget(activeDriver); setActiveDriver(null); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }}
              >
                <Icon name="report" size={17} color={theme.danger} />
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: theme.danger }}>{t.savedDriversScreen.removeDriver}</Text>
              </RNPressable>
            </View>
          </RNPressable>
        </RNPressable>
      </Modal>

      {/* Remove confirmation */}
      <Modal visible={!!removeTarget} transparent animationType="fade" onRequestClose={() => setRemoveTarget(null)}>
        <RNPressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 }} onPress={() => setRemoveTarget(null)}>
          <RNPressable onPress={() => {}} style={{ width: '100%', maxWidth: 320, backgroundColor: theme.surface, borderRadius: radii.lg, padding: 22, alignItems: 'center', ...shadows.lg }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.danger + '1E', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Icon name="close" size={22} color={theme.danger} />
            </View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: theme.text, textAlign: 'center' }}>
              {t.savedDriversScreen.removeTitlePrefix} {removeTarget?.driver?.full_name}?
            </Text>
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: theme.muted, marginTop: 8, textAlign: 'center', lineHeight: 19 }}>
              {t.savedDriversScreen.removeMsgSuffix}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' }}>
              <RNPressable onPress={() => setRemoveTarget(null)} style={{ flex: 1, height: 44, borderRadius: radii.md, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.text }}>{t.profile.cancel}</Text>
              </RNPressable>
              <RNPressable onPress={handleRemove} disabled={removing} style={{ flex: 1, height: 44, borderRadius: radii.md, backgroundColor: theme.danger, alignItems: 'center', justifyContent: 'center', opacity: removing ? 0.6 : 1 }}>
                {removing ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: '#fff' }}>{t.savedDriversScreen.remove}</Text>}
              </RNPressable>
            </View>
          </RNPressable>
        </RNPressable>
      </Modal>
    </View>
  );
}

// Small header chip — RN Pressable, this isn't inside a Modal so the shared
// TouchableOpacity would be fine too, but kept plain for consistency with
// the rest of this screen's touch handling.
function TouchableOpacityChip({ children, onPress, theme }: { children: React.ReactNode; onPress: () => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <RNPressable
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 8, height: 34, paddingHorizontal: 14,
        borderRadius: radii.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.09)',
      }}
    >
      {children}
    </RNPressable>
  );
}
