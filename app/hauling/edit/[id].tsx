import { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { CardBox } from '@/components/ui/CardBox';
import { RuleChip } from '@/components/ui/RuleChip';
import { KindCard } from '@/components/ui/KindCard';
import { Segmented } from '@/components/ui/Segmented';
import { SmartAddressField } from '@/components/ui/SmartAddressField';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { RouteMap } from '@/components/ride/RouteMap';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useRides } from '@/hooks/useRides';
import { RidePost, PostVisibility, RidePostDetailsHauling } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateRouteMapImage, generatePinMapImage, getRouteDetails, RouteDetails } from '@/services/routeMap';
import { PlaceDetail } from '@/services/googlePlaces';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { cityFromAddress } from '@/utils/address';
import { dateToDateString, dateToTimeString } from '@/utils/dateFormat';
import { IconName } from '@/constants/icons';
import { useSavedAddresses } from '@/hooks/useSavedAddresses';
import { addressBookSlots } from '@/constants/addressBookSlots';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { LOAD_TYPES, LOAD_SIZES, ACCESS_OPTIONS, HAULING_PROHIBITED_ITEMS } from '@/constants/haulingFormOptions';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const MAX_HAULING_PHOTOS = 4;

function canEditPost(post: RidePost): boolean {
  return new Date(post.scheduled_at).getTime() - Date.now() > TWO_HOURS_MS;
}

export default function EditHaulingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const { getPostById, updatePost, uploadRouteMap, uploadHaulingPhoto } = useRides();


  const [original, setOriginal] = useState<RidePost | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  const accent = theme.haulingText;
  const accentSoft = theme.haulingSoft;

  const [originCity, setOriginCity] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [originLat, setOriginLat] = useState<number | undefined>();
  const [originLng, setOriginLng] = useState<number | undefined>();
  const [destinationLat, setDestinationLat] = useState<number | undefined>();
  const [destinationLng, setDestinationLng] = useState<number | undefined>();
  const [disposal, setDisposal] = useState<RidePostDetailsHauling['disposal']>('driver');

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
  const effectiveDestCity = disposal === 'address' ? destinationCity : originCity;
  const effectiveDestAddress = disposal === 'address' ? destinationAddress : undefined;
  const effectiveDestLat = disposal === 'address' ? destinationLat : originLat;
  const effectiveDestLng = disposal === 'address' ? destinationLng : originLng;

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [flexibleDate, setFlexibleDate] = useState(false);

  const [loadTypes, setLoadTypes] = useState<string[]>([]);
  const [loadSize, setLoadSize] = useState<RidePostDetailsHauling['loadSize']>('half');
  const [access, setAccess] = useState<string[]>([]);
  const [helpNeeded, setHelpNeeded] = useState(false);
  const [hazardous, setHazardous] = useState(false);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function pickPhoto() {
    if (photoUris.length >= MAX_HAULING_PHOTOS) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to add a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.85 });
    if (!result.canceled && result.assets[0]) setPhotoUris((prev) => [...prev, result.assets[0].uri]);
  }

  const [priceMode, setPriceMode] = useState<'firm' | 'open'>('open');
  const [donation, setDonation] = useState('');
  const [note, setNote] = useState('');

  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [privateDelayHours, setPrivateDelayHours] = useState(6);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const post = await getPostById(id);
      if (!post || post.user_id !== session?.user?.id) {
        Alert.alert(t.post.errorTitle, 'Post not found or unauthorized.');
        router.back();
        return;
      }
      if (!canEditPost(post)) {
        setOriginal(post);
        setLocked(true);
        setPageLoading(false);
        return;
      }
      setOriginal(post);
      prefill(post);
    } catch {
      Alert.alert(t.post.errorTitle, 'Could not load post.');
      router.back();
    } finally {
      setPageLoading(false);
    }
  }

  function prefill(post: RidePost) {
    const details = (post.details ?? {}) as RidePostDetailsHauling;
    const wasAddress = details.disposal === 'address';
    setDisposal(details.disposal ?? 'driver');

    setOriginCity(post.origin_city);
    setOriginAddress(post.origin_address ?? '');
    setOriginLat(post.origin_lat);
    setOriginLng(post.origin_lng);
    // Only prefill destination fields as a real second location if the post
    // was actually saved with one — otherwise destination_city just mirrors
    // origin_city (see effectiveDestCity in the create form) and shouldn't
    // populate the drop-off address field.
    if (wasAddress) {
      setDestinationCity(post.destination_city);
      setDestinationAddress(post.destination_address ?? '');
      setDestinationLat(post.destination_lat);
      setDestinationLng(post.destination_lng);
    }

    const d = new Date(post.scheduled_at);
    setDate(dateToDateString(d));
    setTime(dateToTimeString(d));

    setDonation(post.suggested_donation != null ? String(post.suggested_donation) : '');
    setPriceMode(post.price_mode ?? 'open');
    setNote(post.description ?? '');
    setVisibility(post.visibility);

    setLoadTypes(details.loadTypes ?? []);
    if (details.loadSize) setLoadSize(details.loadSize);
    setAccess(details.access ?? []);
    setHelpNeeded(details.helpNeeded ?? false);
    setHazardous(details.hazardous ?? false);
    setConfirmed(details.prohibitedConfirmed ?? []);
    setPhotoUris(details.photoUrls ?? (details.photoUrl ? [details.photoUrl] : []));
    setFlexibleDate(details.flexibleDate ?? false);
  }

  function toggleTag(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  const [previewRoute, setPreviewRoute] = useState<RouteDetails | null>(null);
  const [previewedFor, setPreviewedFor] = useState<string | null>(null);
  const routeMapDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allConfirmed = HAULING_PROHIBITED_ITEMS.every((p) => confirmed.includes(p.label));
  const ready = !!(
    originCity.trim() && loadTypes.length > 0 && allConfirmed &&
    (flexibleDate || (date.trim() && time.trim())) &&
    (disposal === 'driver' || destinationCity.trim())
  );
  const routeChanged = !original
    || effectiveDestLat !== original.destination_lat || effectiveDestLng !== original.destination_lng
    || originLat !== original.origin_lat || originLng !== original.origin_lng;

  useEffect(() => {
    if (routeMapDebounce.current) clearTimeout(routeMapDebounce.current);
    if (!routeChanged || disposal !== 'address' || originLat == null || originLng == null || destinationLat == null || destinationLng == null) {
      setPreviewRoute(null); setPreviewedFor(null);
      return;
    }
    const key = `${originLat},${originLng}|${destinationLat},${destinationLng}`;
    if (key === previewedFor) return;
    routeMapDebounce.current = setTimeout(async () => {
      const origin = { lat: originLat, lng: originLng };
      const destination = { lat: destinationLat, lng: destinationLng };
      const details = await getRouteDetails(origin, destination);
      setPreviewRoute(details);
      setPreviewedFor(key);
    }, 700);
  }, [routeChanged, disposal, originLat, originLng, destinationLat, destinationLng]);

  async function handleSave() {
    if (!original) return;
    if (!ready) {
      Alert.alert(t.post.requiredFields, t.post.fillRequired);
      return;
    }
    const scheduledAt = flexibleDate
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : new Date(`${date}T${time}:00`);
    if (isNaN(scheduledAt.getTime())) {
      Alert.alert(t.post.invalidDate, t.post.dateFormat);
      return;
    }

    setSaving(true);
    try {
      let photoUrls: string[] = [];
      if (photoUris.length > 0) {
        setUploadingPhoto(true);
        photoUrls = await Promise.all(photoUris.map(async (uri) => {
          if (uri.startsWith('http')) return uri;
          return (await uploadHaulingPhoto(session!.user.id, uri)) ?? '';
        }));
        photoUrls = photoUrls.filter((u) => !!u);
        setUploadingPhoto(false);
      }

      const details: RidePostDetailsHauling = {
        loadTypes,
        loadSize,
        disposal,
        ...(disposal === 'address' ? { dropoffAddress: destinationAddress } : {}),
        access,
        helpNeeded,
        hazardous,
        flexibleDate,
        prohibitedConfirmed: confirmed,
        ...(photoUrls.length > 0 ? { photoUrls } : {}),
      };

      let routeMapUrl = original.route_map_url;
      let durationText = original.duration_text;
      let durationSeconds = original.duration_seconds;
      let distanceText = original.distance_text;
      if (routeChanged && disposal === 'address' && originLat != null && originLng != null && destinationLat != null && destinationLng != null) {
        const cached = previewedFor === `${originLat},${originLng}|${destinationLat},${destinationLng}` ? previewRoute ?? undefined : undefined;
        const route = await generateRouteMapImage({ lat: originLat, lng: originLng }, { lat: destinationLat, lng: destinationLng }, cached);
        if (route.image) routeMapUrl = (await uploadRouteMap(session!.user.id, route.image)) ?? undefined;
        durationText = route.durationText ?? undefined;
        durationSeconds = route.durationSeconds ?? undefined;
        distanceText = route.distanceText ?? undefined;
      } else if (disposal === 'driver' && originLat != null && originLng != null) {
        // No second location to draw a route between — a pin on the pickup
        // point still beats no map at all, same as the create form.
        durationText = undefined; durationSeconds = undefined; distanceText = undefined;
        const pinImage = await generatePinMapImage({ lat: originLat, lng: originLng });
        routeMapUrl = pinImage ? (await uploadRouteMap(session!.user.id, pinImage)) ?? undefined : undefined;
      }

      await updatePost(
        original.id,
        {
          origin_city: originCity,
          origin_address: originAddress || undefined,
          origin_lat: originLat,
          origin_lng: originLng,
          destination_city: effectiveDestCity,
          destination_address: effectiveDestAddress,
          destination_lat: effectiveDestLat,
          destination_lng: effectiveDestLng,
          scheduled_at: scheduledAt.toISOString(),
          suggested_donation: donation ? parseFloat(donation) : undefined,
          price_mode: priceMode,
          description: note || undefined,
          visibility,
          route_map_url: routeMapUrl,
          duration_text: durationText,
          duration_seconds: durationSeconds,
          distance_text: distanceText,
          details,
        },
        original
      );
      setSaved(true);
      setTimeout(() => router.back(), 1500);
    } catch (e: any) {
      Alert.alert(t.post.errorTitle, e.message);
    } finally {
      setSaving(false);
    }
  }

  if (pageLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (locked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background, padding: 32 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={30} color={theme.muted} />
        </View>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 19, letterSpacing: letterSpacingFor(19, tracking.tight), color: theme.text, marginTop: 18, textAlign: 'center' }}>
          {t.post.editLockedTitle}
        </Text>
        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 14, color: theme.muted, marginTop: 8, textAlign: 'center', lineHeight: 20, maxWidth: 280 }}>
          {t.post.editLockedMsg}
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, paddingHorizontal: 28, paddingVertical: 14, backgroundColor: theme.primary, borderRadius: 16 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontFamily: fonts.bodyBold, fontSize: 14 }}>{t.post.goBack}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (saved) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 }}>
        <LinearGradient
          colors={theme.gradientGold as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="check" size={44} color={theme.textOnPrimary} strokeWidth={2.6} />
        </LinearGradient>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: letterSpacingFor(26, tracking.tight), color: theme.text, textAlign: 'center' }}>
            {t.post.updatedTitle}
          </Text>
          <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 14.5, color: theme.muted, marginTop: 6, maxWidth: 260, textAlign: 'center' }}>
            {t.post.updatedMsg}
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
          <IconButton icon="close" variant="glass" label={t.post.close} onPress={() => setShowDiscardConfirm(true)} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {t.post.editRideEyebrow}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 10, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: letterSpacingFor(26, tracking.tight), color: theme.cream, textAlign: 'center' }}>
            Edit your hauling post
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" removeClippedSubviews={false} contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}>
        {/* Load type */}
        <Field label="What needs hauling?" hint={t.post.selectAllApplied}>
          <CardBox>
            {LOAD_TYPES.map((l, i) => (
              <View key={l.label}>
                {i > 0 && <View style={{ height: 1, backgroundColor: theme.border }} />}
                <PlainToggleRow icon={l.icon} label={l.label} sub={l.sub} checked={loadTypes.includes(l.label)} onChange={() => toggleTag(loadTypes, setLoadTypes, l.label)} accent={accent} theme={theme} />
              </View>
            ))}
          </CardBox>
        </Field>

        <Field label="Pickup location">
          <SmartAddressField
            placeholder="Address or area…"
            value={originAddress} onChangeText={setOriginAddress} onSelectPlace={handleOriginPlace}
            onSelectSaved={(v) => setOriginCity(cityFromAddress(v) ?? v)}
            savedAddresses={savedAddresses} emptySlots={emptyAddressSlots} onSaveToSlot={saveAddressToSlot}
            theme={theme} t={t}
          />
        </Field>

        <Field label="Disposal / dropoff">
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <KindCard active={disposal === 'driver'} onPress={() => setDisposal('driver')} icon="truck" title="Driver handles it" sub="Hauler finds a dump site" accent={accent} accentSoft={accentSoft} />
              <KindCard active={disposal === 'address'} onPress={() => setDisposal('address')} icon="location" title="Specific address" sub="I'll provide dropoff" accent={accent} accentSoft={accentSoft} />
            </View>
            {disposal === 'address' && (
              <SmartAddressField
                placeholder="Drop-off address…"
                value={destinationAddress} onChangeText={setDestinationAddress} onSelectPlace={handleDestinationPlace}
                onSelectSaved={(v) => setDestinationCity(cityFromAddress(v) ?? v)}
                savedAddresses={savedAddresses} emptySlots={emptyAddressSlots} onSaveToSlot={saveAddressToSlot}
                theme={theme} t={t}
              />
            )}
          </View>
        </Field>

        {disposal === 'address' && original?.route_map_url && !routeChanged && (
          <Field label={t.post.routeMap} hint={t.post.optional}>
            <RouteMap
              routeMapUrl={original.route_map_url}
              origin={originCity} destination={destinationCity}
              originLat={originLat} originLng={originLng}
              destinationLat={destinationLat} destinationLng={destinationLng}
            />
          </Field>
        )}

        <Field label="Schedule">
          <View style={{ gap: 10 }}>
            <Segmented
              options={[{ value: 'fixed' as const, label: 'Fixed date/time' }, { value: 'flexible' as const, label: 'Anytime this week' }]}
              value={flexibleDate ? 'flexible' : 'fixed'}
              onChange={(v) => setFlexibleDate(v === 'flexible')}
              theme={theme}
            />
            {flexibleDate ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surfaceAlt, padding: 13 }}>
                <Icon name="event" size={16} color={theme.muted} />
                <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.textSecondary, lineHeight: 17 }}>
                  Haulers will see this as flexible — any day works for you this week.
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: theme.muted, marginBottom: 7 }}>{t.post.date}</Text>
                  <DateTimeField mode="date" value={date} onChange={setDate} icon="event" placeholder={t.post.selectDate} doneLabel={t.post.save} locale={t.locale} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: theme.muted, marginBottom: 7 }}>{t.post.time}</Text>
                  <DateTimeField mode="time" value={time} onChange={setTime} icon="schedule" placeholder={t.post.selectTime} doneLabel={t.post.save} locale={t.locale} />
                </View>
              </View>
            )}
          </View>
        </Field>

        <Field label="Load size">
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {LOAD_SIZES.slice(0, 2).map((s) => (
                <LoadSizeCard key={s.value} active={loadSize === s.value} onPress={() => setLoadSize(s.value)} label={s.label} sub={s.sub} accent={accent} accentSoft={accentSoft} theme={theme} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {LOAD_SIZES.slice(2, 4).map((s) => (
                <LoadSizeCard key={s.value} active={loadSize === s.value} onPress={() => setLoadSize(s.value)} label={s.label} sub={s.sub} accent={accent} accentSoft={accentSoft} theme={theme} />
              ))}
            </View>
          </View>
        </Field>

        <Field label="Site access">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ACCESS_OPTIONS.map((a) => (
              <RuleChip key={a} active={access.includes(a)} onPress={() => toggleTag(access, setAccess, a)} accent={accent} theme={theme}>{a}</RuleChip>
            ))}
          </View>
        </Field>

        <Field label="Extra options">
          <CardBox>
            <PlainToggleRow icon="passenger" label="Help carrying" sub="Need muscle on-site" checked={helpNeeded} onChange={setHelpNeeded} accent={accent} theme={theme} />
            <View style={{ height: 1, backgroundColor: theme.border }} />
            <PlainToggleRow icon="ban" label="No hazardous materials" sub="No asbestos, sharp metals or chemicals" checked={hazardous} onChange={setHazardous} accent={accent} theme={theme} />
          </CardBox>
        </Field>

        <Field label="Budget / offer">
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
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint, lineHeight: 16 }}>Haulers can send counter-offers.</Text>
            )}
          </View>
        </Field>

        {/* Liability notice */}
        <View style={{ borderRadius: 14, borderWidth: 1.5, borderColor: theme.borderGold, backgroundColor: theme.badgeWarnBg + '33', padding: 13, flexDirection: 'row', gap: 10 }}>
          <Icon name="shield" size={16} color={theme.gold400} />
          <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, color: theme.textSecondary, lineHeight: 17 }}>
            <Text style={{ fontFamily: fonts.bodyBold, color: theme.text }}>No liability coverage. </Text>
            RideMate provides no property or liability insurance of any kind. Hauling work is at the sole risk of the poster and hauler. The platform is not liable for property damage, loss, or injury.
          </Text>
        </View>

        <Field label="Notes" hint={t.post.optional}>
          <Input
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            placeholder="Photos of the load, special instructions, parking info, anything the hauler should know…"
          />
        </Field>

        <Field label="Photos of load" hint={`${t.post.optional} · ${photoUris.length}/${MAX_HAULING_PHOTOS}`}>
          {photoUris.length === 0 ? (
            <TouchableOpacity
              onPress={pickPhoto}
              style={{
                alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 24,
                borderRadius: radii.lg, borderWidth: 1.5, borderColor: theme.border, borderStyle: 'dashed',
                backgroundColor: theme.surfaceAlt,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
                <Icon name="camera" size={22} color={theme.textFaint} />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.muted, textAlign: 'center' }}>Tap to add a photo</Text>
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint, marginTop: 2 }}>JPG, PNG — helps haulers assess the job</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {photoUris.map((uri, i) => (
                <View key={uri} style={{ width: 84, height: 84, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => setPhotoUris((prev) => prev.filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {photoUris.length < MAX_HAULING_PHOTOS && (
                <TouchableOpacity
                  onPress={pickPhoto}
                  style={{
                    width: 84, height: 84, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5, borderColor: theme.border, borderStyle: 'dashed', backgroundColor: theme.surfaceAlt,
                  }}
                >
                  <Icon name="camera" size={20} color={theme.textFaint} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </Field>

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="ban" size={16} color={theme.danger} />
            <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: letterSpacingFor(12, tracking.wide), color: theme.danger }}>
              Prohibited items
            </Text>
          </View>
          <View style={{ borderRadius: radii.lg, borderWidth: 2, borderColor: theme.danger, backgroundColor: theme.surface, overflow: 'hidden' }}>
            <View style={{ padding: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.danger + '0F' }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>
                Florida law prohibits hauling these without special permits. Confirm your load does <Text style={{ fontFamily: fonts.bodyBold, color: theme.text }}>not</Text> include any of the following to enable posting.
              </Text>
            </View>
            {HAULING_PROHIBITED_ITEMS.map((p, i) => {
              const ok = confirmed.includes(p.label);
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
                      onPress={() => setConfirmed((c) => c.includes(p.label) ? c.filter((x) => x !== p.label) : [...c, p.label])}
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
            {!allConfirmed && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.danger + '0D' }}>
                <Icon name="ban" size={14} color={theme.danger} />
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: theme.danger }}>
                  Confirm {HAULING_PROHIBITED_ITEMS.length - confirmed.length} remaining item{HAULING_PROHIBITED_ITEMS.length - confirmed.length !== 1 ? 's' : ''} to enable posting
                </Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>

      <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, backgroundColor: theme.surface, padding: 16, paddingBottom: insets.bottom + 16 }}>
        <Button variant="primary" size="lg" fullWidth disabled={!ready || saving || uploadingPhoto} onPress={handleSave}>
          {saving ? t.post.saving : t.post.saveChanges}
        </Button>
      </View>

      <ConfirmSheet
        visible={showDiscardConfirm}
        tone="danger"
        icon="close"
        title={t.post.discardTitle}
        message={t.post.discardMsg}
        confirmLabel={t.post.discardConfirm}
        cancelLabel={t.post.discardCancel}
        onConfirm={() => router.back()}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </View>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function LoadSizeCard({
  active, onPress, label, sub, accent, accentSoft, theme,
}: {
  active: boolean; onPress: () => void; label: string; sub: string;
  accent: string; accentSoft: string; theme: ReturnType<typeof useTheme>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1, padding: 13, borderRadius: 14, gap: 4,
        backgroundColor: active ? accentSoft : theme.surface,
        borderWidth: 1.5, borderColor: active ? accent : theme.border,
      }}
    >
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
