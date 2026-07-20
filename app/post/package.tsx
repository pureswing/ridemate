import { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Alert, Image } from 'react-native';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { PublishPicker } from '@/components/ui/PublishPicker';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { CardBox } from '@/components/ui/CardBox';
import { RuleChip } from '@/components/ui/RuleChip';
import { StepRow } from '@/components/ui/StepRow';
import { Segmented } from '@/components/ui/Segmented';
import { SmartAddressField } from '@/components/ui/SmartAddressField';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { RouteMapPlaceholder } from '@/components/ride/RouteMapPlaceholder';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useRides } from '@/hooks/useRides';
import { PostVisibility, RidePostDetailsPackage } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateRouteMapImage, getRouteDetails, buildStaticMapUrl, RouteDetails } from '@/services/routeMap';
import { PlaceDetail } from '@/services/googlePlaces';
import { cityFromAddress } from '@/utils/address';
import { IconName } from '@/constants/icons';
import { useSavedAddresses } from '@/hooks/useSavedAddresses';
import { addressBookSlots } from '@/constants/addressBookSlots';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { PACKAGE_SIZES, CONTENT_TAGS, HANDLING_OPTIONS, PACKAGE_PROHIBITED_ITEMS } from '@/constants/packageFormOptions';

export default function PostPackageScreen() {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const { createPost, uploadRouteMap } = useRides();


  // Package/hauling posts are always the "I need this done" side of the
  // board — the courier/hauler browses and responds, they don't post their
  // own availability. No offer/request toggle, unlike ride's driver/passenger split.
  const accent = theme.courierText;
  const accentSoft = theme.courierSoft;

  // ── Route ──
  const [originCity, setOriginCity] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [originLat, setOriginLat] = useState<number | undefined>();
  const [originLng, setOriginLng] = useState<number | undefined>();
  const [destinationLat, setDestinationLat] = useState<number | undefined>();
  const [destinationLng, setDestinationLng] = useState<number | undefined>();

  const ADDRESS_BOOK_SLOTS = addressBookSlots(t);
  const { getSavedAddresses, saveAddress } = useSavedAddresses();
  const [addressBook, setAddressBook] = useState<Record<string, string>>({});
  useEffect(() => {
    getSavedAddresses().then((rows) => {
      setAddressBook(Object.fromEntries(rows.map((r) => [r.slot_id, r.value])));
    }).catch(() => {});
  }, []);
  const savedAddresses = ADDRESS_BOOK_SLOTS.filter((s) => addressBook[s.id]).map((s) => ({ ...s, value: addressBook[s.id] }));
  const emptyAddressSlots = ADDRESS_BOOK_SLOTS.filter((s) => !addressBook[s.id]);
  function saveAddressToSlot(slotId: string, value: string) {
    setAddressBook((prev) => ({ ...prev, [slotId]: value }));
    saveAddress(slotId, value).catch(() => {});
  }
  function handleOriginPlace(detail: PlaceDetail) {
    setOriginAddress(detail.formattedAddress);
    setOriginLat(detail.lat);
    setOriginLng(detail.lng);
    setOriginCity(detail.city ?? cityFromAddress(detail.formattedAddress) ?? detail.name);
  }
  function handleDestinationPlace(detail: PlaceDetail) {
    setDestinationAddress(detail.formattedAddress);
    setDestinationLat(detail.lat);
    setDestinationLng(detail.lng);
    setDestinationCity(detail.city ?? cityFromAddress(detail.formattedAddress) ?? detail.name);
  }

  // ── Live route map preview — see app/post/ride.tsx's identical block ──
  const [previewMapUrl, setPreviewMapUrl] = useState<string | null>(null);
  const [previewRoute, setPreviewRoute] = useState<RouteDetails | null>(null);
  const [previewedFor, setPreviewedFor] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const routeMapDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (routeMapDebounce.current) clearTimeout(routeMapDebounce.current);
    if (originLat == null || originLng == null || destinationLat == null || destinationLng == null) {
      setPreviewMapUrl(null); setPreviewRoute(null); setPreviewedFor(null);
      return;
    }
    const key = `${originLat},${originLng}|${destinationLat},${destinationLng}`;
    if (key === previewedFor) return;
    setPreviewLoading(true);
    routeMapDebounce.current = setTimeout(async () => {
      const origin = { lat: originLat, lng: originLng };
      const destination = { lat: destinationLat, lng: destinationLng };
      try {
        const details = await getRouteDetails(origin, destination);
        setPreviewRoute(details);
        setPreviewMapUrl(buildStaticMapUrl(origin, destination, details.polyline));
        setPreviewedFor(key);
      } finally {
        setPreviewLoading(false);
      }
    }, 700);
  }, [originLat, originLng, destinationLat, destinationLng]);

  // ── Schedule ──
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // ── Package details ──
  const [qty, setQty] = useState(1);
  const [packageSize, setPackageSize] = useState<RidePostDetailsPackage['packageSize']>('small');
  const [contentTags, setContentTags] = useState<string[]>([]);
  const [handling, setHandling] = useState<string[]>([]);
  const [declaredValue, setDeclaredValue] = useState('');
  const [highValueOk, setHighValueOk] = useState(false);
  const [pkgConfirmed, setPkgConfirmed] = useState<string[]>([]);
  const [inspectionOk, setInspectionOk] = useState(false);
  const [oathAccepted, setOathAccepted] = useState(false);

  // ── Price ──
  const [priceMode, setPriceMode] = useState<'firm' | 'open'>('firm');
  const [donation, setDonation] = useState('');

  // ── Rules / note ──
  const [note, setNote] = useState('');

  // ── Visibility ──
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [privateDelayHours, setPrivateDelayHours] = useState(6);
  const [showPublish, setShowPublish] = useState(false);

  const [loading, setLoading] = useState(false);
  const [posted, setPosted] = useState(false);

  function toggleTag(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  const declaredNum = parseFloat((declaredValue || '').replace(/[^0-9.]/g, '')) || 0;
  const isHighValue = declaredNum > 200;
  const allPkgConfirmed = PACKAGE_PROHIBITED_ITEMS.every((p) => pkgConfirmed.includes(p.label));
  const oathVisible = allPkgConfirmed && contentTags.length > 0;

  const ready = !!(
    originCity.trim() && destinationCity.trim() && date.trim() && time.trim() &&
    contentTags.length > 0 && allPkgConfirmed && inspectionOk && oathAccepted &&
    (!isHighValue || highValueOk)
  );

  async function handleSubmit() {
    if (!ready) {
      Alert.alert(t.post.requiredFields, t.post.fillRequired);
      return;
    }
    const scheduledAt = new Date(`${date}T${time}:00`);
    if (isNaN(scheduledAt.getTime())) {
      Alert.alert(t.post.invalidDate, t.post.dateFormat);
      return;
    }

    const details: RidePostDetailsPackage = {
      qty,
      packageSize,
      contentTags,
      handling,
      ...(declaredValue ? { declaredValue: parseFloat(declaredValue) } : {}),
      prohibitedConfirmed: pkgConfirmed,
      inspectionOk,
      oathAccepted,
      oathAcceptedAt: new Date().toISOString(),
    };

    setLoading(true);
    try {
      const goesPublicAt = visibility === 'private'
        ? new Date(Date.now() + privateDelayHours * 60 * 60 * 1000).toISOString()
        : undefined;

      let routeMapUrl: string | undefined;
      let durationText: string | undefined;
      let durationSeconds: number | undefined;
      let distanceText: string | undefined;
      if (originLat != null && originLng != null && destinationLat != null && destinationLng != null) {
        const cached = previewedFor === `${originLat},${originLng}|${destinationLat},${destinationLng}` ? previewRoute ?? undefined : undefined;
        const route = await generateRouteMapImage({ lat: originLat, lng: originLng }, { lat: destinationLat, lng: destinationLng }, cached);
        if (route.image) routeMapUrl = (await uploadRouteMap(session!.user.id, route.image)) ?? undefined;
        durationText = route.durationText ?? undefined;
        durationSeconds = route.durationSeconds ?? undefined;
        distanceText = route.distanceText ?? undefined;
      }

      await createPost({
        user_id: session!.user.id,
        type: 'request',
        kind: 'package',
        origin_city: originCity,
        origin_address: originAddress || undefined,
        origin_lat: originLat,
        origin_lng: originLng,
        destination_city: destinationCity,
        destination_address: destinationAddress || undefined,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
        scheduled_at: scheduledAt.toISOString(),
        suggested_donation: donation ? parseFloat(donation) : undefined,
        price_mode: priceMode,
        description: note || undefined,
        contact_method: 'in_app',
        visibility,
        goes_public_at: goesPublicAt,
        round_trip: false,
        airport: false,
        route_map_url: routeMapUrl,
        duration_text: durationText,
        duration_seconds: durationSeconds,
        distance_text: distanceText,
        details,
      });

      setPosted(true);
      setTimeout(() => router.replace('/(tabs)'), 1500);
    } catch (e: any) {
      Alert.alert(t.post.errorTitle, e.message);
    } finally {
      setLoading(false);
    }
  }

  if (posted) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 }}>
        <View style={{ width: 88, height: 88, borderRadius: radii.pill, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="package" size={40} color="#fff" />
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: letterSpacingFor(26, tracking.tight), color: theme.text, textAlign: 'center' }}>
            {t.post.postedTitle}
          </Text>
          <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 14.5, color: theme.muted, marginTop: 6, maxWidth: 260, textAlign: 'center' }}>
            Carriers near your route will see your request.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 20, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg, zIndex: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <IconButton icon="close" variant="glass" label={t.post.close} onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            SEND A PACKAGE
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 10, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: letterSpacingFor(26, tracking.tight), color: theme.cream, textAlign: 'center' }}>
            Post a{' '}
            <Text style={{ fontFamily: fonts.bodyItalic, color: theme.courierText }}>delivery</Text>
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" removeClippedSubviews={false} contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}>
        {/* Route — map preview above the address inputs */}
        <Field label={t.post.route} required>
          <View style={{ gap: 10 }}>
            {originLat != null && originLng != null && destinationLat != null && destinationLng != null && (
              previewMapUrl ? (
                <View style={{ width: '100%', height: 210, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
                  <Image source={{ uri: previewMapUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              ) : (
                <RouteMapPlaceholder accent={accent} theme={theme} label={previewLoading ? t.post.loadingMap : t.post.addNavigationMap} />
              )
            )}
            <SmartAddressField
              placeholder="Pickup location…"
              value={originAddress} onChangeText={setOriginAddress} onSelectPlace={handleOriginPlace}
              onSelectSaved={(v) => setOriginCity(cityFromAddress(v) ?? v)}
              savedAddresses={savedAddresses} emptySlots={emptyAddressSlots} onSaveToSlot={saveAddressToSlot}
              theme={theme} t={t}
            />
            <SmartAddressField
              placeholder="Drop-off location…"
              value={destinationAddress} onChangeText={setDestinationAddress} onSelectPlace={handleDestinationPlace}
              onSelectSaved={(v) => setDestinationCity(cityFromAddress(v) ?? v)}
              savedAddresses={savedAddresses} emptySlots={emptyAddressSlots} onSaveToSlot={saveAddressToSlot}
              theme={theme} t={t}
            />
          </View>
        </Field>

        {/* Date + time */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label={t.post.date} style={{ flex: 1 }}>
            <DateTimeField mode="date" value={date} onChange={setDate} icon="event" placeholder={t.post.selectDate} doneLabel={t.post.save} locale={t.locale} />
          </Field>
          <Field label={t.post.time} style={{ flex: 1 }}>
            <DateTimeField mode="time" value={time} onChange={setTime} icon="schedule" placeholder={t.post.selectTime} doneLabel={t.post.save} locale={t.locale} />
          </Field>
        </View>

        {/* Quantity */}
        <Field label="Quantity" hint="How many packages?">
          <CardBox>
            <StepRow icon="package" label="Packages" value={qty} min={1} max={20} onDec={() => setQty((q) => Math.max(1, q - 1))} onInc={() => setQty((q) => Math.min(20, q + 1))} theme={theme} />
          </CardBox>
        </Field>

        {/* Package size — 2x2 icon+sub cards */}
        <Field label="Package size">
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {PACKAGE_SIZES.slice(0, 2).map((s) => (
                <PackageSizeCard key={s.value} active={packageSize === s.value} onPress={() => setPackageSize(s.value)} icon={s.icon} label={s.label} sub={s.sub} accent={accent} accentSoft={accentSoft} theme={theme} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {PACKAGE_SIZES.slice(2, 4).map((s) => (
                <PackageSizeCard key={s.value} active={packageSize === s.value} onPress={() => setPackageSize(s.value)} icon={s.icon} label={s.label} sub={s.sub} accent={accent} accentSoft={accentSoft} theme={theme} />
              ))}
            </View>
          </View>
        </Field>

        {/* Content declaration — mandatory */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: letterSpacingFor(12, tracking.wide), color: theme.text }}>
              Content declaration
            </Text>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: theme.danger }}>required</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CONTENT_TAGS.map((c) => (
              <RuleChip key={c} active={contentTags.includes(c)} onPress={() => toggleTag(contentTags, setContentTags, c)} accent={accent} theme={theme}>{c}</RuleChip>
            ))}
          </View>
          {contentTags.length === 0 && (
            <Text style={{ marginTop: 7, fontFamily: fonts.bodySemibold, fontSize: 11.5, color: theme.danger }}>
              Select at least one content type to continue.
            </Text>
          )}
        </View>

        {/* Special handling */}
        <Field label="Special handling">
          <CardBox>
            {HANDLING_OPTIONS.map((h, i) => (
              <View key={h.label}>
                {i > 0 && <View style={{ height: 1, backgroundColor: theme.border }} />}
                <PlainToggleRow icon={h.icon} label={h.label} sub={h.sub} checked={handling.includes(h.label)} onChange={() => toggleTag(handling, setHandling, h.label)} accent={accent} theme={theme} />
              </View>
            ))}
          </CardBox>
        </Field>

        {/* Declared value — zero-insurance notice + high-value acknowledgment */}
        <Field label="Declared value" hint={t.post.optional}>
          <Input
            prefix="$"
            value={declaredValue}
            onChangeText={(v) => { setDeclaredValue(v.replace(/[^0-9.]/g, '')); setHighValueOk(false); }}
            inputMode="decimal"
            placeholder="0.00"
          />
          <View style={{ marginTop: 10, borderRadius: 14, borderWidth: 1.5, borderColor: theme.borderGold, backgroundColor: theme.badgeWarnBg + '33', padding: 13, flexDirection: 'row', gap: 10 }}>
            <Icon name="shield" size={16} color={theme.gold400} />
            <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, color: theme.textSecondary, lineHeight: 17 }}>
              <Text style={{ fontFamily: fonts.bodyBold, color: theme.text }}>Zero insurance coverage. </Text>
              RideMate provides no cargo insurance of any kind. All shipments are at the sole risk of the sender and carrier. The platform is not liable for loss, damage, or theft.
            </Text>
          </View>
          {isHighValue && (
            <TouchableOpacity
              onPress={() => setHighValueOk((v) => !v)}
              style={{
                marginTop: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 11,
                backgroundColor: highValueOk ? theme.badgeWarnBg + '33' : theme.surface,
                borderWidth: 1.5, borderColor: highValueOk ? theme.borderGold : theme.danger,
                borderRadius: 14, padding: 13,
              }}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 1,
                backgroundColor: highValueOk ? theme.gold400 : 'transparent',
                borderWidth: highValueOk ? 0 : 2, borderColor: theme.danger,
              }}>
                {highValueOk && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12.5, color: theme.danger, marginBottom: 2 }}>
                  High-value shipment — ${Math.round(declaredNum).toLocaleString()} declared
                </Text>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.textSecondary, lineHeight: 17 }}>
                  I understand this shipment exceeds $200 and is sent entirely at my own risk. RideMate will not compensate for any loss or damage under any circumstance.
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </Field>

        {/* Price */}
        <Field label={t.post.offerLabel}>
          <View style={{ gap: 10 }}>
            <Segmented
              options={[{ value: 'firm' as const, label: t.post.firmPrice }, { value: 'open' as const, label: t.post.openToOffers }]}
              value={priceMode} onChange={setPriceMode} theme={theme}
            />
            <Input
              icon={priceMode === 'firm' ? 'lock' : 'lock_open'}
              prefix="$"
              value={donation}
              onChangeText={(v) => setDonation(v.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              placeholder="0"
              rightElement={
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11.5, color: theme.textFaint }}>
                  {priceMode === 'firm' ? t.post.priceFixed : t.post.priceStarting}
                </Text>
              }
            />
            {priceMode === 'open' && (
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint, lineHeight: 16 }}>Carriers can counter-offer your price.</Text>
            )}
          </View>
        </Field>

        {/* Prohibited package contents — per-item confirmation */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="ban" size={16} color={theme.danger} />
            <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: letterSpacingFor(12, tracking.wide), color: theme.danger }}>
              Prohibited contents
            </Text>
          </View>
          <View style={{ borderRadius: radii.lg, borderWidth: 2, borderColor: theme.danger, backgroundColor: theme.surface, overflow: 'hidden' }}>
            <View style={{ padding: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.danger + '0F' }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>
                The following items are <Text style={{ fontFamily: fonts.bodyBold, color: theme.text }}>strictly prohibited</Text> and may result in legal action. Confirm your package does <Text style={{ fontFamily: fonts.bodyBold, color: theme.text }}>not</Text> contain any of these.
              </Text>
            </View>
            {PACKAGE_PROHIBITED_ITEMS.map((p, i) => {
              const ok = pkgConfirmed.includes(p.label);
              return (
                <View key={p.label}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: theme.border, marginHorizontal: 16 }} />}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: ok ? theme.success + '0F' : 'transparent' }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: ok ? theme.success : theme.text, textDecorationLine: ok ? 'line-through' : 'none' }}>
                        {p.label}
                      </Text>
                      {p.sub && <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint, marginTop: 2, lineHeight: 15 }}>{p.sub}</Text>}
                    </View>
                    <TouchableOpacity
                      onPress={() => setPkgConfirmed((c) => c.includes(p.label) ? c.filter((x) => x !== p.label) : [...c, p.label])}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 13, borderRadius: radii.pill,
                        borderWidth: 1.5, borderColor: ok ? theme.success : theme.danger,
                        backgroundColor: ok ? theme.success + '1F' : theme.danger + '14',
                      }}
                    >
                      {ok && <Icon name="check" size={14} color={theme.success} strokeWidth={2.6} />}
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: ok ? theme.success : theme.danger }}>{ok ? 'None' : 'Confirm'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            {!allPkgConfirmed && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.danger + '0D' }}>
                <Icon name="ban" size={14} color={theme.danger} />
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: theme.danger }}>
                  Confirm {PACKAGE_PROHIBITED_ITEMS.length - pkgConfirmed.length} remaining item{PACKAGE_PROHIBITED_ITEMS.length - pkgConfirmed.length !== 1 ? 's' : ''} to continue
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Community rule: right of inspection */}
        <View style={{ borderRadius: radii.lg, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface, overflow: 'hidden', ...shadows.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surfaceAlt }}>
            <Icon name="shield" size={16} color={theme.primary} />
            <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.primary }}>
              Community rule<Text style={{ color: theme.danger }}> *</Text>
            </Text>
          </View>
          <View style={{ padding: 16 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, letterSpacing: letterSpacingFor(16, tracking.tight), color: theme.text, marginBottom: 8 }}>
              Derecho de Inspección en la Entrega
            </Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.textSecondary, lineHeight: 20, marginBottom: 14 }}>
              The carrier has the right to ask you to <Text style={{ fontFamily: fonts.bodyBold, color: theme.text }}>show the contents of the package</Text> before loading it into their vehicle, to verify it matches what was declared. If you refuse the inspection, the carrier may <Text style={{ fontFamily: fonts.bodyBold, color: theme.text }}>cancel without penalty</Text>.
            </Text>
            <TouchableOpacity
              onPress={() => setInspectionOk((v) => !v)}
              style={{
                flexDirection: 'row', alignItems: 'flex-start', gap: 11,
                backgroundColor: inspectionOk ? theme.success + '12' : theme.surfaceAlt,
                borderWidth: 1.5, borderColor: inspectionOk ? theme.success : theme.border,
                borderRadius: 14, padding: 13,
              }}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 1,
                backgroundColor: inspectionOk ? theme.success : 'transparent',
                borderWidth: inspectionOk ? 0 : 2, borderColor: theme.border,
              }}>
                {inspectionOk && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}
              </View>
              <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.textSecondary, lineHeight: 18 }}>
                I understand and agree that the carrier may inspect my package at pickup. I will not refuse a reasonable inspection request.
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Digital oath — appears once contents are declared and confirmed */}
        {oathVisible && (
          <TouchableOpacity
            onPress={() => setOathAccepted((v) => !v)}
            style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 12,
              backgroundColor: oathAccepted ? theme.success + '12' : theme.surface,
              borderWidth: 1.5, borderColor: oathAccepted ? theme.success : theme.border,
              borderRadius: 14, padding: 14,
            }}
          >
            <View style={{
              width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 1,
              backgroundColor: oathAccepted ? theme.success : 'transparent',
              borderWidth: oathAccepted ? 0 : 2, borderColor: theme.border,
            }}>
              {oathAccepted && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}
            </View>
            <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.textSecondary, lineHeight: 17 }}>
              <Text style={{ fontFamily: fonts.bodyBold, color: theme.text }}>I declare under penalty of law</Text> that the contents of this package are accurately described above, contain no prohibited items, and comply with all applicable federal, state and local regulations.
            </Text>
          </TouchableOpacity>
        )}

        {/* Note */}
        <Field label={t.post.note} hint={t.post.optional}>
          <Input
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            placeholder="Access instructions, fragile contents, anything the carrier should know…"
          />
        </Field>
      </ScrollView>

      {/* sticky post button — stays visible while the form scrolls */}
      <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, backgroundColor: theme.surface, padding: 16, paddingBottom: insets.bottom + 16 }}>
        <Button variant="primary" size="lg" fullWidth disabled={!ready || loading} onPress={() => setShowPublish(true)}>
          {loading ? t.post.publishing : 'Post delivery request'}
        </Button>
      </View>

      <PublishPicker
        visible={showPublish}
        onClose={() => setShowPublish(false)}
        onPublic={() => { setShowPublish(false); handleSubmit(); }}
        onPrivate={() => setShowPublish(false)}
        hasSaved={false}
        accent={accent}
        icon="package"
      />
    </View>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function PackageSizeCard({
  active, onPress, icon, label, sub, accent, accentSoft, theme,
}: {
  active: boolean; onPress: () => void; icon: IconName; label: string; sub: string;
  accent: string; accentSoft: string; theme: ReturnType<typeof useTheme>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1, padding: 13, borderRadius: 14, gap: 6,
        backgroundColor: active ? accentSoft : theme.surface,
        borderWidth: 1.5, borderColor: active ? accent : theme.border,
      }}
    >
      <Icon name={icon} size={20} color={active ? accent : theme.muted} />
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.text }}>{label}</Text>
      <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.muted }}>{sub}</Text>
    </TouchableOpacity>
  );
}

function PlainToggleRow({
  icon, label, sub, checked, onChange, accent, theme,
}: {
  icon: IconName; label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void;
  accent: string; theme: ReturnType<typeof useTheme>;
}) {
  return (
    <TouchableOpacity onPress={() => onChange(!checked)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, flexShrink: 1, minWidth: 0 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={18} color={theme.text} />
        </View>
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: theme.text }}>{label}</Text>
          {sub && <Text numberOfLines={1} style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint }}>{sub}</Text>}
        </View>
      </View>
      <View style={{ width: 38, height: 22, borderRadius: 11, backgroundColor: checked ? accent : theme.border, justifyContent: 'center' }}>
        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', marginLeft: checked ? 18 : 2 }} />
      </View>
    </TouchableOpacity>
  );
}
