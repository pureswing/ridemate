import { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
import { KindCard } from '@/components/ui/KindCard';
import { Segmented } from '@/components/ui/Segmented';
import { SmartAddressField } from '@/components/ui/SmartAddressField';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useRides } from '@/hooks/useRides';
import { PostVisibility, RidePostDetailsHauling } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateRouteMapImage, getRouteDetails, RouteDetails } from '@/services/routeMap';
import { PlaceDetail } from '@/services/googlePlaces';
import { cityFromAddress } from '@/utils/address';
import { IconName } from '@/constants/icons';
import { useSavedAddresses } from '@/hooks/useSavedAddresses';
import { addressBookSlots } from '@/constants/addressBookSlots';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { LOAD_TYPES, LOAD_SIZES, ACCESS_OPTIONS, HAULING_PROHIBITED_ITEMS } from '@/constants/haulingFormOptions';

// Keeps the picker a simple thumbnail row instead of a full gallery, and
// keeps per-post storage usage bounded — each photo is a real file in the
// hauling-photos Supabase Storage bucket, not a DB blob, but still worth capping.
const MAX_HAULING_PHOTOS = 4;

export default function PostHaulingScreen() {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const { createPost, uploadRouteMap, uploadHaulingPhoto } = useRides();


  // Hauling posts are always the "I need this hauled" side of the board —
  // the hauler browses and responds, same reasoning as app/post/package.tsx.
  const accent = theme.haulingText;
  const accentSoft = theme.haulingSoft;

  // ── Route (pickup always; drop-off only if disposal === 'address') ──
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
    setOriginCity(cityFromAddress(detail.formattedAddress) ?? detail.name);
  }
  function handleDestinationPlace(detail: PlaceDetail) {
    setDestinationAddress(detail.formattedAddress);
    setDestinationLat(detail.lat);
    setDestinationLng(detail.lng);
    setDestinationCity(cityFromAddress(detail.formattedAddress) ?? detail.name);
  }
  // Real destination columns used only when there's a real second location
  // (disposal === 'address') — otherwise the pickup location doubles as the
  // destination, since destination_city is NOT NULL and there's no second
  // real location to store when the driver just takes it away.
  const effectiveDestCity = disposal === 'address' ? destinationCity : originCity;
  const effectiveDestAddress = disposal === 'address' ? destinationAddress : undefined;
  const effectiveDestLat = disposal === 'address' ? destinationLat : originLat;
  const effectiveDestLng = disposal === 'address' ? destinationLng : originLng;

  // ── Route stats — computed at submit only; no live preview, matching
  // the original design (PostHauling.jsx has no map/route widget). ──
  const [previewRoute, setPreviewRoute] = useState<RouteDetails | null>(null);
  const [previewedFor, setPreviewedFor] = useState<string | null>(null);
  const routeMapDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (routeMapDebounce.current) clearTimeout(routeMapDebounce.current);
    if (disposal !== 'address' || originLat == null || originLng == null || destinationLat == null || destinationLng == null) {
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
  }, [disposal, originLat, originLng, destinationLat, destinationLng]);

  // ── Schedule ──
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [flexibleDate, setFlexibleDate] = useState(false);

  // ── Load details ──
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

  // ── Price ──
  const [priceMode, setPriceMode] = useState<'firm' | 'open'>('open');
  const [donation, setDonation] = useState('');

  // ── Note ──
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

  const allConfirmed = HAULING_PROHIBITED_ITEMS.every((p) => confirmed.includes(p.label));
  const ready = !!(
    originCity.trim() && loadTypes.length > 0 && allConfirmed &&
    (flexibleDate || (date.trim() && time.trim())) &&
    (disposal === 'driver' || destinationCity.trim())
  );

  async function handleSubmit() {
    if (!ready) {
      Alert.alert(t.post.requiredFields, t.post.fillRequired);
      return;
    }
    // Flexible posts still need a real timestamp for the NOT NULL scheduled_at
    // column — this one's a placeholder (end of the coming week), never shown
    // to the user; the UI reads flexibleDate instead of this value.
    const scheduledAt = flexibleDate
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : new Date(`${date}T${time}:00`);
    if (isNaN(scheduledAt.getTime())) {
      Alert.alert(t.post.invalidDate, t.post.dateFormat);
      return;
    }

    setLoading(true);
    try {
      let photoUrls: string[] = [];
      if (photoUris.length > 0) {
        setUploadingPhoto(true);
        const uploaded = await Promise.all(photoUris.map((uri) => uploadHaulingPhoto(session!.user.id, uri)));
        photoUrls = uploaded.filter((u): u is string => !!u);
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

      const goesPublicAt = visibility === 'private'
        ? new Date(Date.now() + privateDelayHours * 60 * 60 * 1000).toISOString()
        : undefined;

      let routeMapUrl: string | undefined;
      let durationText: string | undefined;
      let durationSeconds: number | undefined;
      let distanceText: string | undefined;
      if (disposal === 'address' && originLat != null && originLng != null && destinationLat != null && destinationLng != null) {
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
        kind: 'hauling',
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
          <Icon name="truck" size={40} color="#fff" />
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: letterSpacingFor(26, tracking.tight), color: theme.text, textAlign: 'center' }}>
            Job posted!
          </Text>
          <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 14.5, color: theme.muted, marginTop: 6, maxWidth: 260, textAlign: 'center' }}>
            Haulers in your area will see your request and send offers.
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
            HAULING &amp; REMOVAL
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 10, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: letterSpacingFor(26, tracking.tight), color: theme.cream, textAlign: 'center' }}>
            Post a{' '}
            <Text style={{ fontFamily: fonts.bodyItalic, color: theme.haulingText }}>haul job</Text>
          </Text>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center' }}>
            Debris removal · junk haul · furniture pickup
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

        {/* Pickup location */}
        <Field label="Pickup location">
          <SmartAddressField
            placeholder="Address or area…"
            value={originAddress} onChangeText={setOriginAddress} onSelectPlace={handleOriginPlace}
            onSelectSaved={(v) => setOriginCity(cityFromAddress(v) ?? v)}
            savedAddresses={savedAddresses} emptySlots={emptyAddressSlots} onSaveToSlot={saveAddressToSlot}
            theme={theme} t={t}
          />
        </Field>

        {/* Disposal */}
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

        {/* Date + time / flexible schedule */}
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

        {/* Load size — 2x2 label+sub cards */}
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

        {/* Site access */}
        <Field label="Site access">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ACCESS_OPTIONS.map((a) => (
              <RuleChip key={a} active={access.includes(a)} onPress={() => toggleTag(access, setAccess, a)} accent={accent} theme={theme}>{a}</RuleChip>
            ))}
          </View>
        </Field>

        {/* Extra options */}
        <Field label="Extra options">
          <CardBox>
            <PlainToggleRow icon="passenger" label="Help carrying" sub="Need muscle on-site" checked={helpNeeded} onChange={setHelpNeeded} accent={accent} theme={theme} />
            <View style={{ height: 1, backgroundColor: theme.border }} />
            <PlainToggleRow icon="ban" label="No hazardous materials" sub="No asbestos, sharp metals or chemicals" checked={hazardous} onChange={setHazardous} accent={accent} theme={theme} />
          </CardBox>
        </Field>

        {/* Price */}
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

        {/* Notes */}
        <Field label="Notes" hint={t.post.optional}>
          <Input
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            placeholder="Photos of the load, special instructions, parking info, anything the hauler should know…"
          />
        </Field>

        {/* Photos of load */}
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

        {/* Prohibited items — per-item confirmation */}
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

      {/* sticky post button — stays visible while the form scrolls */}
      <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, backgroundColor: theme.surface, padding: 16, paddingBottom: insets.bottom + 16 }}>
        <Button variant="primary" size="lg" fullWidth disabled={!ready || loading || uploadingPhoto} onPress={() => setShowPublish(true)}>
          {loading ? t.post.publishing : 'Post haul job'}
        </Button>
      </View>

      <PublishPicker
        visible={showPublish}
        onClose={() => setShowPublish(false)}
        onPublic={() => { setShowPublish(false); handleSubmit(); }}
        onPrivate={() => setShowPublish(false)}
        hasSaved={false}
        accent={accent}
        icon="truck"
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
