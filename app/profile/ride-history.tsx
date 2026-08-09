import { useCallback, useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { HistoryCard } from '@/components/ride/HistoryCard';
import { TripSummaryModal } from '@/components/ride/TripSummaryModal';
import { InfoSheet } from '@/components/ui/InfoSheet';
import { useAuthStore } from '@/store/authStore';
import { useRideHistory, RideHistoryTypeFilter, RideHistoryPeriodFilter } from '@/hooks/useRideHistory';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RideAgreement, TripRecord, VehicleProfile, BadgeType } from '@/types';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { buildCsv, shareCsv } from '@/utils/exportCsv';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function RideHistoryScreen() {
  const { session } = useAuthStore();
  const { getCompletedRides, getVehiclesForDrivers, getBadgesReceived } = useRideHistory();
  const t = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [typeFilter, setTypeFilter] = useState<RideHistoryTypeFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<RideHistoryPeriodFilter>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [agreements, setAgreements] = useState<RideAgreement[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, VehicleProfile>>({});
  const [badges, setBadges] = useState<Record<string, BadgeType[]>>({});
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tripRecord, setTripRecord] = useState<TripRecord | null>(null);
  const [infoSheet, setInfoSheet] = useState<{ tone: 'info' | 'danger'; title: string; message: string } | null>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const myId = session?.user?.id;

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  const loadPage = useCallback(async (offset: number, replace: boolean) => {
    if (!myId) return;
    const { items, hasMore: more } = await getCompletedRides(myId, {
      typeFilter, periodFilter, search: debouncedSearch, offset, limit: PAGE_SIZE,
    });
    setAgreements((prev) => (replace ? items : [...prev, ...items]));
    setHasMore(more);

    const driverIds = items.map((a) => a.driver_id);
    const agreementIds = items.map((a) => a.id);
    const [vehicleMap, badgeMap] = await Promise.all([
      getVehiclesForDrivers(driverIds),
      getBadgesReceived(agreementIds, myId),
    ]);
    setVehicles((prev) => ({ ...prev, ...vehicleMap }));
    setBadges((prev) => ({ ...prev, ...badgeMap }));
  }, [myId, typeFilter, periodFilter, debouncedSearch, getCompletedRides, getVehiclesForDrivers, getBadgesReceived]);

  useEffect(() => {
    if (!myId) return;
    setLoading(true);
    exitSelectionMode();
    loadPage(0, true).finally(() => setLoading(false));
  }, [myId, typeFilter, periodFilter, debouncedSearch]);

  async function handleEndReached() {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      await loadPage(agreements.length, false);
    } finally {
      setLoadingMore(false);
    }
  }

  function enterSelectionMode(id: string) {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(agreements.map((a) => a.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function openRecord(agreement: RideAgreement) {
    if (!myId) return;
    const isDriver = agreement.driver_id === myId;
    const post = agreement.post as any;
    const kind = post?.kind ?? 'ride';
    const vehicle = vehicles[agreement.driver_id];
    const details = post?.details ?? {};
    const bagCount: number | undefined = details.bags ?? details.bagTypes?.length;

    setTripRecord({
      agreementId: agreement.id,
      kind,
      origin: post?.origin_city ?? '—',
      destination: post?.destination_city ?? '—',
      originAddress: post?.origin_address,
      destinationAddress: post?.destination_address,
      stops: details.stops,
      scheduledAt: post?.scheduled_at ?? '',
      suggestedDonation: post?.suggested_donation,
      distanceText: post?.distance_text,
      durationText: post?.duration_text,
      otherPartyName: isDriver ? agreement.rider?.full_name ?? '—' : agreement.driver?.full_name ?? '—',
      myRole: isDriver ? 'driver' : 'rider',
      badges: badges[agreement.id],
      vehicle: vehicle ? {
        make: vehicle.make, model: vehicle.model, year: vehicle.year, color: vehicle.color,
        insured: vehicle.insurance_self_certified, vehicleType: vehicle.vehicle_type,
      } : undefined,
      passengerCount: kind === 'ride' ? (details.adults ?? 0) + (details.children ?? 0) || undefined : undefined,
      luggagePresent: kind === 'ride' && bagCount != null ? bagCount > 0 : undefined,
      luggageCount: kind === 'ride' ? bagCount : undefined,
      packageQty: kind === 'package' ? details.qty : undefined,
      loadSize: kind === 'hauling' ? details.loadSize : undefined,
    });
  }

  async function handleExport() {
    if (!myId || exporting) return;
    setExporting(true);
    try {
      let rows: RideAgreement[];
      if (selectionMode && selectedIds.size > 0) {
        rows = agreements.filter((a) => selectedIds.has(a.id));
      } else {
        // No selection — export everything matching the current filters,
        // not just what's been scrolled into view so far.
        const { items } = await getCompletedRides(myId, { typeFilter, periodFilter, search: debouncedSearch, offset: 0, limit: Number.MAX_SAFE_INTEGER });
        rows = items;
      }
      if (rows.length === 0) {
        setInfoSheet({ tone: 'info', title: t.rideHistoryScreen.exportEmptyTitle, message: t.rideHistoryScreen.exportEmptyMsg });
        return;
      }

      const headers = [
        t.tripSummary.date, t.tripSummary.time, t.rideHistoryScreen.exportColKind, t.rideHistoryScreen.exportColRole,
        t.tripSummary.origin, t.tripSummary.destination, t.tripSummary.pickupAddress, t.tripSummary.dropoffAddress,
        t.rideHistoryScreen.exportColOtherParty, t.tripSummary.contribution,
      ];
      const csvRows = rows.map((a) => {
        const post = a.post as any;
        const isDriver = a.driver_id === myId;
        const scheduledAt = post?.scheduled_at ? new Date(post.scheduled_at) : null;
        const other = isDriver ? a.rider : a.driver;
        return [
          scheduledAt ? scheduledAt.toLocaleDateString(t.locale, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '',
          scheduledAt ? scheduledAt.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' }) : '',
          post?.kind ?? '',
          isDriver ? t.tripSummary.driver : t.tripSummary.rider,
          post?.origin_city ?? '',
          post?.destination_city ?? '',
          post?.origin_address ?? '',
          post?.destination_address ?? '',
          other?.username ?? other?.full_name ?? '',
          post?.suggested_donation ?? '',
        ];
      });
      const csv = buildCsv(headers, csvRows);
      await shareCsv(csv, `ride-history-${Date.now()}.csv`);
    } catch (e: any) {
      setInfoSheet({ tone: 'danger', title: t.rideDetail.errorTitle, message: e.message });
    } finally {
      setExporting(false);
    }
  }

  const typeOpts: { key: RideHistoryTypeFilter; label: string }[] = [
    { key: 'driver', label: t.rideHistoryScreen.filterDriver },
    { key: 'rider', label: t.rideHistoryScreen.filterRider },
    { key: 'package', label: t.rideHistoryScreen.filterPackage },
    { key: 'hauling', label: t.rideHistoryScreen.filterHauling },
  ];
  const periodOpts: { key: RideHistoryPeriodFilter; label: string }[] = [
    { key: 'all', label: t.rideHistoryScreen.periodAll },
    { key: 'week', label: t.rideHistoryScreen.periodWeek },
    { key: 'month', label: t.rideHistoryScreen.periodMonth },
    { key: 'lastMonth', label: t.rideHistoryScreen.periodLastMonth },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg, zIndex: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {selectionMode ? (
            <IconButton icon="close" variant="glass" label={t.rideHistoryScreen.cancelSelection} onPress={exitSelectionMode} />
          ) : (
            <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          )}
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {selectionMode ? `${selectedIds.size} ${t.rideHistoryScreen.selectedSuffix}` : t.rideHistoryScreen.title}
          </Text>
          <IconButton
            icon="download"
            variant="glass"
            label={t.rideHistoryScreen.exportLabel}
            disabled={exporting}
            onPress={handleExport}
          />
        </View>

        {!selectionMode && (
          <View style={{ marginTop: 14 }}>
            <Input
              icon="search"
              placeholder={t.rideHistoryScreen.searchPlaceholder}
              value={search}
              onChangeText={setSearch}
              containerStyle={{ marginHorizontal: 4 }}
            />
          </View>
        )}

        {selectionMode ? (
          <View style={{ flexDirection: 'row', gap: 18, marginTop: 14, paddingHorizontal: 4 }}>
            <TouchableOpacity onPress={selectAll}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: theme.gold300 }}>{t.rideHistoryScreen.selectAll}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={deselectAll}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: theme.gold300 }}>{t.rideHistoryScreen.deselectAll}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingHorizontal: 4 }}>
              {typeOpts.map((o) => (
                <Chip key={o.key} size="sm" selected={typeFilter === o.key} color={theme.gradientJade} shadow={shadows.xs} onPress={() => setTypeFilter(o.key)}>
                  {o.label}
                </Chip>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, marginTop: 8, paddingHorizontal: 4 }}>
              {periodOpts.map((o) => (
                <Chip key={o.key} size="sm" selected={periodFilter === o.key} color={theme.gradientJade} shadow={shadows.xs} onPress={() => setPeriodFilter(o.key)}>
                  {o.label}
                </Chip>
              ))}
            </ScrollView>
          </>
        )}
      </LinearGradient>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.primary} />
      ) : (
        <FlatList
          data={agreements}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HistoryCard
              agreement={item}
              myId={myId ?? ''}
              onPress={() => openRecord(item)}
              selectionMode={selectionMode}
              selected={selectedIds.has(item.id)}
              onLongPress={() => enterSelectionMode(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          onEndReachedThreshold={0.4}
          onEndReached={handleEndReached}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginTop: 14 }} color={theme.primary} /> : null}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <View style={{
                width: 72, height: 72, borderRadius: radii.xl,
                backgroundColor: theme.primary + '1A',
                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <Icon name="car" size={36} color={theme.primary} />
              </View>
              <Text style={{ color: theme.text, fontFamily: fonts.displayBold, fontSize: 18, marginBottom: 8 }}>
                {t.rideHistoryScreen.empty}
              </Text>
              <Text style={{ color: theme.muted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 }}>
                {t.rideHistoryScreen.emptySubtitle}
              </Text>
            </View>
          }
        />
      )}

      <TripSummaryModal visible={!!tripRecord} record={tripRecord} onClose={() => setTripRecord(null)} />

      <InfoSheet
        visible={!!infoSheet}
        tone={infoSheet?.tone}
        icon={infoSheet?.tone === 'danger' ? 'warning' : 'download'}
        title={infoSheet?.title ?? ''}
        message={infoSheet?.message ?? ''}
        confirmLabel={t.rideHistoryScreen.gotIt}
        onClose={() => setInfoSheet(null)}
      />
    </View>
  );
}
