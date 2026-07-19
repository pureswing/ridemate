import { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Alert, ActivityIndicator, Modal, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { CollapsibleField } from '@/components/ui/CollapsibleField';
import { PlainToggleRow } from '@/components/ui/PlainToggleRow';
import { KindCard } from '@/components/ui/KindCard';
import { StepRow } from '@/components/ui/StepRow';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { RowDivider } from '@/components/ui/RowDivider';
import { DelayBadge } from '@/components/ui/DelayBadge';
import { Segmented } from '@/components/ui/Segmented';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { OversizedSheet } from '@/components/ui/OversizedSheet';
import { SmartAddressField } from '@/components/ui/SmartAddressField';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { RouteMapPlaceholder } from '@/components/ride/RouteMapPlaceholder';
import { RouteMap } from '@/components/ride/RouteMap';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useRides } from '@/hooks/useRides';
import { RidePost, PostVisibility, RidePostDetailsRide, AccessibilityNeed } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLORIDA_AIRPORTS, Airport } from '@/constants/florida-airports';
import { lookupFlight, parseFlightTime, FlightInfo } from '@/services/flightInfo';
import { generateRouteMapImage, getRouteDetails, buildStaticMapUrl, RouteDetails } from '@/services/routeMap';
import { AirportPicker } from '@/components/ui/AirportPicker';
import { PlaceDetail } from '@/services/googlePlaces';
import { cityFromAddress } from '@/utils/address';
import { dateToDateString, dateToTimeString } from '@/utils/dateFormat';
import { useSavedAddresses } from '@/hooks/useSavedAddresses';
import { addressBookSlots } from '@/constants/addressBookSlots';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { VEHICLE_TYPES, COMFORT_PREFS, CLIMATE_PREFS, SPECIFIC_TEMP, CHILD_SEAT_OPTIONS, ATMOSPHERE_PREFS, CLEANLINESS_PREFS, PET_PREFS, PICKUP_PREFS, DRIVER_LANGUAGE_PREFS } from '@/constants/rideFormOptions';
import { ACCESSIBILITY_OPTIONS } from '@/constants/accessibilityOptions';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function canEditPost(post: RidePost): boolean {
  return new Date(post.scheduled_at).getTime() - Date.now() > TWO_HOURS_MS;
}

// Full parity with app/post/ride.tsx's create form — same components, same
// editable fields — except `type` (offer/request) itself, which stays fixed
// post-creation: switching a driver offer into a passenger request mid-life
// doesn't have a sane field mapping (seats_available vs. adults/children),
// so it's shown read-only here rather than as a Segmented.
export default function EditRideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const { getPostById, updatePost, uploadRouteMap } = useRides();

  const [original, setOriginal] = useState<RidePost | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  const isDriver = original?.type === 'offer';
  const accent = isDriver ? theme.driverText : theme.primary;
  const accentSoft = isDriver ? theme.driverSoft : theme.passengerSoft;

  // ── Trip type (passenger only): regular vs event ──
  const [isEvent, setIsEvent] = useState(false);
  const [eventName, setEventName] = useState('');
  const [vehiclesNeeded, setVehiclesNeeded] = useState(3);

  // ── Route ──
  const [originCity, setOriginCity] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [originLat, setOriginLat] = useState<number | undefined>();
  const [originLng, setOriginLng] = useState<number | undefined>();
  const [destinationLat, setDestinationLat] = useState<number | undefined>();
  const [destinationLng, setDestinationLng] = useState<number | undefined>();
  // Intermediate stops, in order — same as create form, see its comment.
  const [stops, setStops] = useState<string[]>([]);
  const [stopsConfirmed, setStopsConfirmed] = useState<boolean[]>([]);

  // ── Address book — visual only, session-local, same as create form ──
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

  // ── Airport mode ──
  const [isOriginAirport, setIsOriginAirport] = useState(false);
  const [isDestinationAirport, setIsDestinationAirport] = useState(false);
  const [selectedOriginAirport, setSelectedOriginAirport] = useState<Airport | null>(null);
  const [selectedDestinationAirport, setSelectedDestinationAirport] = useState<Airport | null>(null);
  const airport = isOriginAirport || isDestinationAirport;
  const airportLeg: 'to' | 'from' = isDestinationAirport ? 'to' : 'from';

  // ── Flight ──
  const [flightNumber, setFlightNumber] = useState('');
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [flightLoading, setFlightLoading] = useState(false);
  const flightDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Skips the lookup once for the value prefill sets on load — otherwise
  // every edit-screen open for an airport trip re-fires the paid API call
  // before the user has touched anything.
  const flightMounted = useRef(false);

  // ── Live route map preview — same reasoning as app/post/ride.tsx's
  // identical block: only meaningful once `routeChanged`, since an unchanged
  // route already shows the real stored map. ──
  const [previewMapUrl, setPreviewMapUrl] = useState<string | null>(null);
  const [previewRoute, setPreviewRoute] = useState<RouteDetails | null>(null);
  const [previewedFor, setPreviewedFor] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const routeMapDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Schedule ──
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // ── Who's riding ──
  const [seats, setSeats] = useState(2);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [childSeatPrefs, setChildSeatPrefs] = useState<string[]>(['No child seat needed']);

  // ── Luggage ──
  const [bags, setBags] = useState(0);
  const [bagTypes, setBagTypes] = useState<string[]>([]);
  const [oversizedInfo, setOversizedInfo] = useState<Record<number, { types: string[]; other: string }>>({});
  const [pickingOversized, setPickingOversized] = useState<number | null>(null);

  // ── Price — rateBasis/priceMode/vehicle are visual only, no schema field,
  // same as create form; nothing to prefill for them. ──
  const [donation, setDonation] = useState('');
  const [rateBasis, setRateBasis] = useState<'trip' | 'hourly'>('trip');
  const [priceMode, setPriceMode] = useState<'firm' | 'open'>('firm');
  const [vehicle, setVehicle] = useState('');

  // ── Passenger vehicle/comfort/climate prefs ──
  const [vehicleType, setVehicleType] = useState('No preference');
  const [comfortPrefs, setComfortPrefs] = useState<string[]>(['No preference']);
  const [climatePrefs, setClimatePrefs] = useState<string[]>(['No preference']);
  const [tempPref, setTempPref] = useState(72);

  // ── Accessibility + other granular passenger prefs — prefilled from the
  // post's own saved details below, not from the profile's current needs. ──
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<AccessibilityNeed[]>([]);
  const [atmospherePrefs, setAtmospherePrefs] = useState<string[]>(['No preference']);
  const [cleanlinessPrefs, setCleanlinessPrefs] = useState<string[]>([]);
  const [petPrefs, setPetPrefs] = useState<string[]>(['No pet']);
  const [pickupPrefs, setPickupPrefs] = useState<string[]>(['Standard curbside pickup']);
  const [driverLanguage, setDriverLanguage] = useState('No preference');

  // ── Rules / note ──
  const [rules, setRules] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');

  // ── Visibility ──
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [privateDelayHours, setPrivateDelayHours] = useState(6);

  const [saving, setSaving] = useState(false);

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
    const fromAirport = post.airport && post.airport_leg === 'from';
    const toAirport = post.airport && post.airport_leg === 'to';
    setIsOriginAirport(!!fromAirport);
    setSelectedOriginAirport(fromAirport ? FLORIDA_AIRPORTS.find((a) => a.name === post.origin_address) ?? null : null);
    setIsDestinationAirport(!!toAirport);
    setSelectedDestinationAirport(toAirport ? FLORIDA_AIRPORTS.find((a) => a.name === post.destination_address) ?? null : null);

    setOriginCity(post.origin_city);
    setOriginAddress(post.origin_address ?? '');
    setOriginLat(post.origin_lat);
    setOriginLng(post.origin_lng);
    setDestinationCity(post.destination_city);
    setDestinationAddress(post.destination_address ?? '');
    setDestinationLat(post.destination_lat);
    setDestinationLng(post.destination_lng);

    setFlightNumber(post.flight_number ?? '');

    const d = new Date(post.scheduled_at);
    setDate(dateToDateString(d));
    setTime(dateToTimeString(d));

    setSeats(post.seats_available ?? 2);
    setDonation(post.suggested_donation != null ? String(post.suggested_donation) : '');
    setNote(post.description ?? '');
    setVisibility(post.visibility);

    const details = (post.details ?? {}) as RidePostDetailsRide;
    setRules(details.rules ?? {});
    setBags(details.bags ?? 0);
    setBagTypes(details.bagTypes ?? []);
    const oversizedMap: Record<number, { types: string[]; other: string }> = {};
    (details.oversizedInfo ?? []).forEach((info, i) => { oversizedMap[i] = info; });
    setOversizedInfo(oversizedMap);
    if (details.vehicleType) setVehicleType(details.vehicleType);
    setComfortPrefs(details.comfortPrefs ?? ['No preference']);
    setClimatePrefs(details.climatePrefs ?? ['No preference']);
    if (details.tempPref) setTempPref(details.tempPref);
    setAdults(details.adults ?? 1);
    setChildren(details.children ?? 0);
    setChildSeatPrefs(details.childSeatPrefs ?? ['No child seat needed']);
    if (details.eventName) { setIsEvent(true); setEventName(details.eventName); }
    if (details.vehiclesNeeded) setVehiclesNeeded(details.vehiclesNeeded);
    setAccessibilityNeeds(details.accessibilityNeeds ?? []);
    setAtmospherePrefs(details.atmospherePrefs ?? ['No preference']);
    setCleanlinessPrefs(details.cleanlinessPrefs ?? []);
    setPetPrefs(details.petPrefs ?? ['No pet']);
    setPickupPrefs(details.pickupPrefs ?? ['Standard curbside pickup']);
    if (details.driverLanguage) setDriverLanguage(details.driverLanguage);
    setStops(details.stops ?? []);
    setStopsConfirmed((details.stops ?? []).map(() => true));
  }

  // Auto-lookup flight when number is entered (only when an airport is
  // selected) — skips the run the prefill itself triggers.
  useEffect(() => {
    if (!flightMounted.current) { flightMounted.current = true; return; }
    if (flightDebounce.current) clearTimeout(flightDebounce.current);
    if (flightNumber.replace(/\s/g, '').length < 3) { setFlightInfo(null); return; }
    flightDebounce.current = setTimeout(async () => {
      setFlightLoading(true);
      const info = await lookupFlight(flightNumber);
      setFlightInfo(info);
      setFlightLoading(false);
    }, 600);
  }, [flightNumber]);

  function applyFlightTime(useArrival: boolean) {
    if (!flightInfo) return;
    const timeStr = useArrival ? flightInfo.arrival.scheduledTime : flightInfo.departure.scheduledTime;
    const parsed = parseFlightTime(timeStr);
    if (parsed) { setDate(parsed.date); setTime(parsed.time); }
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
  function handleOriginAirportSelect(a: Airport) {
    setSelectedOriginAirport(a);
    setOriginAddress(a.name); setOriginCity(a.city); setOriginLat(a.lat); setOriginLng(a.lng);
  }
  function handleDestinationAirportSelect(a: Airport) {
    setSelectedDestinationAirport(a);
    setDestinationAddress(a.name); setDestinationCity(a.city); setDestinationLat(a.lat); setDestinationLng(a.lng);
  }
  function toggleOriginAirport(v: boolean) {
    setIsOriginAirport(v);
    setSelectedOriginAirport(null); setOriginAddress(''); setOriginCity(''); setOriginLat(undefined); setOriginLng(undefined);
    if (!v && !isDestinationAirport) { setFlightNumber(''); setFlightInfo(null); }
  }
  function toggleDestinationAirport(v: boolean) {
    setIsDestinationAirport(v);
    setSelectedDestinationAirport(null); setDestinationAddress(''); setDestinationCity(''); setDestinationLat(undefined); setDestinationLng(undefined);
    if (!v && !isOriginAirport) { setFlightNumber(''); setFlightInfo(null); }
  }

  function toggleExclusive(list: string[], setList: (v: string[]) => void, value: string, exclusiveValue: string) {
    if (value === exclusiveValue) { setList(list.includes(value) ? [] : [exclusiveValue]); return; }
    const withoutDefault = list.filter((x) => x !== exclusiveValue);
    setList(withoutDefault.includes(value) ? withoutDefault.filter((x) => x !== value) : [...withoutDefault, value]);
  }

  function toggleTagPlain(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  const ready = !!(originCity.trim() && destinationCity.trim() && date.trim() && time.trim());
  const originalStops = ((original?.details as RidePostDetailsRide | undefined)?.stops ?? []).join('|');
  const currentStopsKey = stops.filter((s, i) => stopsConfirmed[i] && s.trim()).join('|');
  const routeChanged = !original
    || originLat !== original.origin_lat || originLng !== original.origin_lng
    || destinationLat !== original.destination_lat || destinationLng !== original.destination_lng
    || currentStopsKey !== originalStops;

  useEffect(() => {
    if (routeMapDebounce.current) clearTimeout(routeMapDebounce.current);
    if (!routeChanged || originLat == null || originLng == null || destinationLat == null || destinationLng == null) {
      setPreviewMapUrl(null); setPreviewRoute(null); setPreviewedFor(null);
      return;
    }
    const waypoints = stops.filter((s, i) => stopsConfirmed[i] && s.trim());
    const key = `${originLat},${originLng}|${destinationLat},${destinationLng}|${waypoints.join('|')}`;
    if (key === previewedFor) return;
    setPreviewLoading(true);
    routeMapDebounce.current = setTimeout(async () => {
      const origin = { lat: originLat, lng: originLng };
      const destination = { lat: destinationLat, lng: destinationLng };
      try {
        const details = await getRouteDetails(origin, destination, waypoints);
        setPreviewRoute(details);
        setPreviewMapUrl(buildStaticMapUrl(origin, destination, details.polyline, waypoints));
        setPreviewedFor(key);
      } finally {
        setPreviewLoading(false);
      }
    }, 700);
  }, [routeChanged, originLat, originLng, destinationLat, destinationLng, stops, stopsConfirmed]);

  async function handleSave() {
    if (!original) return;
    if (!ready) {
      Alert.alert(t.post.requiredFields, t.post.fillRequired);
      return;
    }
    const scheduledAt = new Date(`${date}T${time}:00`);
    if (isNaN(scheduledAt.getTime())) {
      Alert.alert(t.post.invalidDate, t.post.dateFormat);
      return;
    }

    const stopWaypoints = stops.filter((s, i) => stopsConfirmed[i] && s.trim());

    const details: RidePostDetailsRide = {
      rules,
      bags,
      bagTypes,
      oversizedInfo: Object.values(oversizedInfo),
      ...(stopWaypoints.length > 0 ? { stops: stopWaypoints } : {}),
      ...(isDriver ? {} : {
        vehicleType,
        comfortPrefs,
        climatePrefs,
        ...(climatePrefs.includes(SPECIFIC_TEMP) ? { tempPref } : {}),
        adults,
        children,
        ...(children > 0 ? { childSeatPrefs } : {}),
        ...(accessibilityNeeds.length > 0 ? { accessibilityNeeds } : {}),
        ...(atmospherePrefs.length > 0 ? { atmospherePrefs } : {}),
        ...(cleanlinessPrefs.length > 0 ? { cleanlinessPrefs } : {}),
        ...(petPrefs.length > 0 ? { petPrefs } : {}),
        ...(pickupPrefs.length > 0 ? { pickupPrefs } : {}),
        ...(driverLanguage !== 'No preference' ? { driverLanguage } : {}),
      }),
      ...(isEvent ? { eventName, vehiclesNeeded } : {}),
    };

    setSaving(true);
    try {
      // Only regenerate the route map (another Directions + Static Maps
      // call) if the route actually changed — otherwise keep the existing
      // stored image, matching the "generate once" model from create.
      let routeMapUrl = original.route_map_url;
      let durationText = original.duration_text;
      let durationSeconds = original.duration_seconds;
      let distanceText = original.distance_text;
      if (routeChanged && originLat != null && originLng != null && destinationLat != null && destinationLng != null) {
        // Reuse the live preview's already-fetched Directions result if it's
        // still for this exact origin/destination pair.
        const cached = previewedFor === `${originLat},${originLng}|${destinationLat},${destinationLng}|${stopWaypoints.join('|')}` ? previewRoute ?? undefined : undefined;
        const route = await generateRouteMapImage({ lat: originLat, lng: originLng }, { lat: destinationLat, lng: destinationLng }, cached, stopWaypoints);
        if (route.image) routeMapUrl = (await uploadRouteMap(session!.user.id, route.image)) ?? undefined;
        durationText = route.durationText ?? undefined;
        durationSeconds = route.durationSeconds ?? undefined;
        distanceText = route.distanceText ?? undefined;
      }

      await updatePost(
        original.id,
        {
          origin_city: originCity,
          origin_address: originAddress || undefined,
          origin_lat: originLat,
          origin_lng: originLng,
          destination_city: destinationCity,
          destination_address: destinationAddress || undefined,
          destination_lat: destinationLat,
          destination_lng: destinationLng,
          scheduled_at: scheduledAt.toISOString(),
          seats_available: isDriver ? seats : undefined,
          suggested_donation: donation ? parseFloat(donation) : undefined,
          description: note || undefined,
          visibility,
          airport,
          airport_leg: airport ? airportLeg : undefined,
          flight_number: airport && flightNumber ? flightNumber : undefined,
          route_map_url: routeMapUrl,
          duration_text: durationText,
          duration_seconds: durationSeconds,
          distance_text: distanceText,
          details,
        },
        original
      );
      Alert.alert(t.post.updatedTitle, t.post.updatedMsg, [{ text: 'OK', onPress: () => router.back() }]);
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      {/* header */}
      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 20, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg, zIndex: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <IconButton icon="close" variant="glass" label={t.post.close} onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {t.post.editRideEyebrow}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 10, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: letterSpacingFor(26, tracking.tight), color: theme.cream, textAlign: 'center' }}>
            {t.post.editRideTitle}
          </Text>
        </View>
      </LinearGradient>

      {/* removeClippedSubviews={false} — see app/post/ride.tsx's identical
          comment: Android's off-screen ScrollView clipping can leave touch
          handlers stale below the fold until a native scroll forces relayout. */}
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" removeClippedSubviews={false} contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}>
        {/* I'm offering / looking — fixed post-creation, shown read-only */}
        <Field label={t.post.imTitle}>
          <View style={{ backgroundColor: theme.surfaceAlt, borderRadius: radii.pill, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: theme.text }}>
              {isDriver ? t.post.imOffering : t.post.imLooking}
            </Text>
          </View>
        </Field>

        {/* trip type (passenger only) */}
        {!isDriver && (
          <Field label={t.post.tripType}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <KindCard active={!isEvent} onPress={() => setIsEvent(false)} icon="car_front" title={t.post.tripRegular} sub={t.post.tripRegularSub} accent={accent} accentSoft={accentSoft} />
              <KindCard active={isEvent} onPress={() => setIsEvent(true)} icon="bus_front" title={t.post.tripEvent} sub={t.post.tripEventSub} accent={accent} accentSoft={accentSoft} />
            </View>
          </Field>
        )}
        {!isDriver && isEvent && (
          <Field label={t.post.eventDetails}>
            <View style={{ gap: 10 }}>
              <Input placeholder={t.post.eventNamePlaceholder} value={eventName} onChangeText={setEventName} />
              <CardBox>
                <StepRow icon="ticket" label={t.post.vehiclesNeeded} sub={t.post.vehiclesNeededSub} value={vehiclesNeeded} min={2} max={20}
                  onDec={() => setVehiclesNeeded((v) => Math.max(2, v - 1))} onInc={() => setVehiclesNeeded((v) => Math.min(20, v + 1))} theme={theme} />
              </CardBox>
            </View>
          </Field>
        )}

        {/* Route */}
        <Field label={t.post.route}>
          <View style={{ gap: 10 }}>
            {isOriginAirport ? (
              <AirportPicker selectedAirport={selectedOriginAirport} onSelect={handleOriginAirportSelect}
                onClear={() => { setSelectedOriginAirport(null); setOriginAddress(''); setOriginCity(''); setOriginLat(undefined); setOriginLng(undefined); }} />
            ) : (
              <SmartAddressField
                placeholder={t.post.routeOriginPlaceholder}
                value={originAddress} onChangeText={setOriginAddress} onSelectPlace={handleOriginPlace}
                onSelectSaved={(v) => setOriginCity(cityFromAddress(v) ?? v)}
                savedAddresses={savedAddresses} emptySlots={emptyAddressSlots} onSaveToSlot={saveAddressToSlot}
                theme={theme} t={t}
              />
            )}
            {isDestinationAirport ? (
              <AirportPicker selectedAirport={selectedDestinationAirport} onSelect={handleDestinationAirportSelect}
                onClear={() => { setSelectedDestinationAirport(null); setDestinationAddress(''); setDestinationCity(''); setDestinationLat(undefined); setDestinationLng(undefined); }} />
            ) : (
              <SmartAddressField
                placeholder={t.post.routeDestPlaceholder}
                value={destinationAddress} onChangeText={setDestinationAddress} onSelectPlace={handleDestinationPlace}
                onSelectSaved={(v) => setDestinationCity(cityFromAddress(v) ?? v)}
                savedAddresses={savedAddresses} emptySlots={emptyAddressSlots} onSaveToSlot={saveAddressToSlot}
                theme={theme} t={t}
              />
            )}

            {stops.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AddressAutocomplete
                  style={{ flex: 1 }}
                  placeholder={`${t.post.stopPlaceholder} ${i + 1} (${t.post.optional})`}
                  value={s}
                  onChangeText={(v) => {
                    setStops((prev) => prev.map((x, idx) => (idx === i ? v : x)));
                    setStopsConfirmed((prev) => prev.map((x, idx) => (idx === i ? false : x)));
                  }}
                  onSelectPlace={(detail) => {
                    setStops((prev) => prev.map((x, idx) => (idx === i ? detail.formattedAddress : x)));
                    setStopsConfirmed((prev) => prev.map((x, idx) => (idx === i ? true : x)));
                  }}
                />
                <TouchableOpacity
                  onPress={() => {
                    setStops((prev) => prev.filter((_, idx) => idx !== i));
                    setStopsConfirmed((prev) => prev.filter((_, idx) => idx !== i));
                  }}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="close" size={14} color={theme.textFaint} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              {stops.length < 10 && (
                <TouchableOpacity
                  onPress={() => { setStops((prev) => [...prev, '']); setStopsConfirmed((prev) => [...prev, false]); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1.5, borderColor: theme.border, borderStyle: 'dashed' }}
                >
                  <Icon name="location" size={14} color={theme.muted} />
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: theme.muted }}>
                    {t.post.addStop}{stops.length > 0 ? ` (${stops.length}/10)` : ''}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Field>

        {/* Airport trip toggle + flight */}
        <ToggleRow icon="addr_airport" label={t.post.airportTrip} sub={t.post.airportTripSub} checked={airport}
          onChange={(v) => { toggleOriginAirport(false); toggleDestinationAirport(false); if (v) toggleDestinationAirport(true); }}
          theme={theme} />
        {airport && (
          <View style={{ gap: 10, marginTop: -8 }}>
            <Segmented
              options={[{ value: 'to' as const, label: t.post.toAirport }, { value: 'from' as const, label: t.post.fromAirport }]}
              value={airportLeg}
              onChange={(v) => { if (v === 'to') { toggleDestinationAirport(true); toggleOriginAirport(false); } else { toggleOriginAirport(true); toggleDestinationAirport(false); } }}
              theme={theme}
            />
            <Input
              placeholder={t.post.flightPlaceholder}
              value={flightNumber}
              onChangeText={(v) => setFlightNumber(v.toUpperCase())}
              autoCapitalize="characters"
            />
            {flightLoading && <ActivityIndicator size="small" color={theme.primary} />}
            {flightInfo && (
              <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.cardBorder, backgroundColor: theme.surfaceAlt, padding: 14, gap: 8 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: theme.text }}>
                  {flightInfo.airline} · {flightInfo.flightNumber} · {flightInfo.status}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => applyFlightTime(false)} style={{ flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
                    <Text style={{ color: theme.muted, fontSize: 11 }}>DEPARTURE</Text>
                    <Text style={{ color: theme.text, fontFamily: fonts.bodyBold, fontSize: 13 }}>{flightInfo.departure.scheduledTime.split(' ')[1]?.slice(0, 5) ?? '—'}</Text>
                    <DelayBadge minutes={flightInfo.departure.delayMinutes} theme={theme} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => applyFlightTime(true)} style={{ flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
                    <Text style={{ color: theme.muted, fontSize: 11 }}>ARRIVAL</Text>
                    <Text style={{ color: theme.text, fontFamily: fonts.bodyBold, fontSize: 13 }}>{flightInfo.arrival.scheduledTime.split(' ')[1]?.slice(0, 5) ?? '—'}</Text>
                    <DelayBadge minutes={flightInfo.arrival.delayMinutes} theme={theme} />
                  </TouchableOpacity>
                </View>
                {(flightInfo.departure.terminal || flightInfo.departure.gate || flightInfo.arrival.terminal || flightInfo.arrival.gate) && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ flex: 1, fontSize: 11, color: theme.muted, textAlign: 'center' }}>
                      {[flightInfo.departure.terminal && `Terminal ${flightInfo.departure.terminal}`, flightInfo.departure.gate && `Gate ${flightInfo.departure.gate}`].filter(Boolean).join(' · ') || '—'}
                    </Text>
                    <Text style={{ flex: 1, fontSize: 11, color: theme.muted, textAlign: 'center' }}>
                      {[flightInfo.arrival.terminal && `Terminal ${flightInfo.arrival.terminal}`, flightInfo.arrival.gate && `Gate ${flightInfo.arrival.gate}`].filter(Boolean).join(' · ') || '—'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Route map — only once both origin/destination have real coords;
            real stored image if the route hasn't changed since it was
            generated; a live preview (debounced Directions + Static Maps
            call) once it has; decorative placeholder while that loads. */}
        {originLat != null && originLng != null && destinationLat != null && destinationLng != null && (
          <Field label={t.post.routeMap} hint={t.post.optional}>
            {original?.route_map_url && !routeChanged ? (
              <RouteMap
                routeMapUrl={original.route_map_url}
                origin={originCity} destination={destinationCity}
                originLat={originLat} originLng={originLng}
                destinationLat={destinationLat} destinationLng={destinationLng}
              />
            ) : previewMapUrl ? (
              <View style={{ width: '100%', height: 210, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
                <Image source={{ uri: previewMapUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
            ) : (
              <RouteMapPlaceholder accent={accent} theme={theme} label={previewLoading ? t.post.loadingMap : t.post.addNavigationMap} />
            )}
          </Field>
        )}

        {/* Date + time — tap opens the device's own calendar / clock picker */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label={t.post.date} style={{ flex: 1 }}>
            <DateTimeField mode="date" value={date} onChange={setDate} icon="event" placeholder={t.post.selectDate} doneLabel={t.post.save} locale={t.locale} />
          </Field>
          <Field label={t.post.time} style={{ flex: 1 }}>
            <DateTimeField mode="time" value={time} onChange={setTime} icon="schedule" placeholder={t.post.selectTime} doneLabel={t.post.save} locale={t.locale} />
          </Field>
        </View>

        {/* Seats (driver) / Who's riding (passenger) */}
        {isDriver ? (
          <Field label={t.post.seatsAvailable}>
            <CardBox>
              <StepRow icon="passenger" label={t.post.seatsLabel} value={seats} min={1} max={7} onDec={() => setSeats((s) => Math.max(1, s - 1))} onInc={() => setSeats((s) => Math.min(7, s + 1))} theme={theme} />
            </CardBox>
          </Field>
        ) : (
          <>
            <Field label={t.post.whosRiding}>
              <CardBox>
                <StepRow icon="passenger" label={t.post.adults} value={adults} min={1} max={7} onDec={() => setAdults((a) => Math.max(1, a - 1))} onInc={() => setAdults((a) => Math.min(7, a + 1))} theme={theme} />
                <RowDivider theme={theme} />
                <StepRow icon="baby_seat" label={t.post.children} sub={t.post.childrenSub} value={children} min={0} max={6} onDec={() => setChildren((c) => Math.max(0, c - 1))} onInc={() => setChildren((c) => Math.min(6, c + 1))} theme={theme} />
              </CardBox>
            </Field>
            {children > 0 && (
              <CollapsibleField label={t.post.childSeat} hint={t.post.selectAllApplied}>
                <CardBox>
                  {CHILD_SEAT_OPTIONS.map((c, i) => (
                    <View key={c}>
                      {i > 0 && <View style={{ height: 1, backgroundColor: theme.border }} />}
                      <PlainToggleRow label={c} checked={childSeatPrefs.includes(c)} onChange={() => toggleExclusive(childSeatPrefs, setChildSeatPrefs, c, 'No child seat needed')} accent={accent} theme={theme} />
                    </View>
                  ))}
                </CardBox>
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint, lineHeight: 16, marginTop: 10 }}>{t.post.childSeatWarning}</Text>
              </CollapsibleField>
            )}
          </>
        )}

        {/* Luggage */}
        <Field label={isDriver ? t.post.luggageSpace : t.post.luggageLabel} hint={t.post.optional}>
          <CardBox>
            <StepRow icon="luggage" label={t.post.bags} value={bags} min={0} max={9} onDec={() => setBags((b) => Math.max(0, b - 1))} onInc={() => setBags((b) => Math.min(9, b + 1))} theme={theme} />
            {bags > 0 && (
              <View style={{ paddingTop: 8, paddingBottom: 12, gap: 13 }}>
                {Array.from({ length: bags }).map((_, i) => (
                  <View key={i}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.textFaint, marginBottom: 8 }}>
                      {t.post.bagNumber} {i + 1}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[t.post.bagCarryOn, t.post.bagChecked, t.post.bagOversized].map((b) => (
                        <RuleChip key={b} active={(bagTypes[i] || t.post.bagCarryOn) === b} accent={accent} theme={theme} style={{ flex: 1, paddingHorizontal: 8 }}
                          onPress={() => { setBagTypes((prev) => { const next = [...prev]; next[i] = b; return next; }); if (b === t.post.bagOversized) setPickingOversized(i); }}
                        >{b}</RuleChip>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </CardBox>
        </Field>

        {/* Price */}
        <Field label={isDriver ? t.post.priceLabel : t.post.offerLabel} hint={isDriver ? t.post.priceGasSplit : t.post.priceWhatPay}>
          <View style={{ gap: 10 }}>
            <Segmented
              options={[{ value: 'trip' as const, label: t.post.perTrip }, { value: 'hourly' as const, label: t.post.perHour }]}
              value={rateBasis} onChange={setRateBasis} theme={theme}
            />
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
                  {rateBasis === 'hourly' ? '/ hour' : (priceMode === 'firm' ? t.post.priceFixed : t.post.priceStarting)}
                </Text>
              }
            />
          </View>
        </Field>

        {/* Vehicle (driver, free text) */}
        {isDriver && (
          <Field label={t.post.vehicle} hint={t.post.optional}>
            <Input icon="car" value={vehicle} onChangeText={setVehicle} placeholder={t.post.vehiclePlaceholder} />
          </Field>
        )}

        {/* Vehicle type / rules / comfort / climate (passenger only) */}
        {!isDriver && (
          <CollapsibleField label={t.post.vehicleTypeLabel} hint="Select one">
            <CardBox>
              {VEHICLE_TYPES.map((v, i) => (
                <View key={v}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: theme.border }} />}
                  <PlainToggleRow label={v} checked={vehicleType === v} onChange={() => setVehicleType(v)} accent={accent} theme={theme} />
                </View>
              ))}
            </CardBox>
          </CollapsibleField>
        )}

        {!isDriver && (
          <CollapsibleField label={t.post.comfortSeating} hint={t.post.selectAllApplied}>
            <CardBox>
              {COMFORT_PREFS.map((c, i) => (
                <View key={c}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: theme.border }} />}
                  <PlainToggleRow label={c} checked={comfortPrefs.includes(c)} onChange={() => toggleExclusive(comfortPrefs, setComfortPrefs, c, 'No preference')} accent={accent} theme={theme} />
                </View>
              ))}
            </CardBox>
          </CollapsibleField>
        )}
        {!isDriver && (
          <CollapsibleField label={t.post.climateControl} hint={t.post.selectAllApplied}>
            <CardBox>
              {CLIMATE_PREFS.map((c, i) => (
                <View key={c}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: theme.border }} />}
                  <PlainToggleRow label={c} checked={climatePrefs.includes(c)} onChange={() => toggleExclusive(climatePrefs, setClimatePrefs, c, 'No preference')} accent={accent} theme={theme} />
                </View>
              ))}
              <View style={{ height: 1, backgroundColor: theme.border }} />
              <PlainToggleRow
                icon="thermometer"
                label={SPECIFIC_TEMP}
                checked={climatePrefs.includes(SPECIFIC_TEMP)}
                onChange={() => setClimatePrefs((prev) => { const w = prev.filter((x) => x !== 'No preference'); return w.includes(SPECIFIC_TEMP) ? w.filter((x) => x !== SPECIFIC_TEMP) : [...w, SPECIFIC_TEMP]; })}
                accent={accent}
                theme={theme}
              />
            </CardBox>
            {climatePrefs.includes(SPECIFIC_TEMP) && (
              <CardBox style={{ marginTop: 10 }}>
                <StepRow icon="thermometer" label={t.post.targetTemp} sub="°F" value={tempPref} min={60} max={80} onDec={() => setTempPref((v) => Math.max(60, v - 1))} onInc={() => setTempPref((v) => Math.min(80, v + 1))} theme={theme} />
              </CardBox>
            )}
          </CollapsibleField>
        )}

        {/* Accessibility (passenger only) */}
        {!isDriver && (
          <CollapsibleField label="Accessibility" hint={t.post.selectAllApplied}>
            <CardBox>
              {ACCESSIBILITY_OPTIONS.map((opt, i) => (
                <View key={opt.id}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: theme.border }} />}
                  <PlainToggleRow
                    icon={opt.icon}
                    label={opt.label}
                    sub={opt.desc}
                    checked={accessibilityNeeds.includes(opt.id)}
                    onChange={() => setAccessibilityNeeds((prev) =>
                      prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id]
                    )}
                    accent={accent}
                    theme={theme}
                  />
                </View>
              ))}
            </CardBox>
          </CollapsibleField>
        )}

        {/* Ride atmosphere (passenger only) */}
        {!isDriver && (
          <CollapsibleField label="Ride atmosphere" hint={t.post.selectAllApplied}>
            <CardBox>
              {ATMOSPHERE_PREFS.map((a, i) => (
                <View key={a}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: theme.border }} />}
                  <PlainToggleRow label={a} checked={atmospherePrefs.includes(a)} onChange={() => toggleExclusive(atmospherePrefs, setAtmospherePrefs, a, 'No preference')} accent={accent} theme={theme} />
                </View>
              ))}
            </CardBox>
          </CollapsibleField>
        )}

        {/* Cleanliness & sensitivities (passenger only) */}
        {!isDriver && (
          <CollapsibleField label="Cleanliness">
            <CardBox>
              {CLEANLINESS_PREFS.map((c, i) => (
                <View key={c}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: theme.border }} />}
                  <PlainToggleRow label={c} checked={cleanlinessPrefs.includes(c)} onChange={() => toggleTagPlain(cleanlinessPrefs, setCleanlinessPrefs, c)} accent={accent} theme={theme} />
                </View>
              ))}
            </CardBox>
          </CollapsibleField>
        )}

        {/* Pet transportation (passenger only) */}
        {!isDriver && (
          <CollapsibleField label="Pet transportation" hint={t.post.selectAllApplied}>
            <CardBox>
              {PET_PREFS.map((p, i) => (
                <View key={p}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: theme.border }} />}
                  <PlainToggleRow label={p} checked={petPrefs.includes(p)} onChange={() => toggleExclusive(petPrefs, setPetPrefs, p, 'No pet')} accent={accent} theme={theme} />
                </View>
              ))}
            </CardBox>
          </CollapsibleField>
        )}

        {/* Pickup preferences (passenger only) */}
        {!isDriver && (
          <CollapsibleField label="Pickup preferences" hint={t.post.selectAllApplied}>
            <CardBox>
              {PICKUP_PREFS.map((p, i) => (
                <View key={p}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: theme.border }} />}
                  <PlainToggleRow label={p} checked={pickupPrefs.includes(p)} onChange={() => toggleExclusive(pickupPrefs, setPickupPrefs, p, 'Standard curbside pickup')} accent={accent} theme={theme} />
                </View>
              ))}
            </CardBox>
          </CollapsibleField>
        )}

        {/* Preferred driver language (passenger only) */}
        {!isDriver && (
          <CollapsibleField label="Preferred driver language" hint={t.post.optional}>
            <CardBox>
              {DRIVER_LANGUAGE_PREFS.map((l, i) => (
                <View key={l}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: theme.border }} />}
                  <PlainToggleRow label={l} checked={driverLanguage === l} onChange={() => setDriverLanguage(l)} accent={accent} theme={theme} />
                </View>
              ))}
            </CardBox>
          </CollapsibleField>
        )}

        {/* Note */}
        <Field label={t.post.note} hint={t.post.optional}>
          <Input
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            placeholder={isDriver ? t.post.notePlaceholderDriver : t.post.notePlaceholderPassenger}
          />
        </Field>
      </ScrollView>

      {/* sticky save */}
      <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, backgroundColor: theme.surface, padding: 16, paddingBottom: insets.bottom + 16 }}>
        <Button variant="primary" size="lg" fullWidth disabled={!ready || saving} onPress={handleSave}>
          {saving ? t.post.saving : t.post.saveChanges}
        </Button>
      </View>

      {/* oversized item sheet */}
      <Modal visible={pickingOversized !== null} transparent animationType="slide" onRequestClose={() => setPickingOversized(null)}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setPickingOversized(null)}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <OversizedSheet
                value={pickingOversized !== null ? (oversizedInfo[pickingOversized] ?? { types: [], other: '' }) : { types: [], other: '' }}
                onSave={(v) => { if (pickingOversized !== null) setOversizedInfo((prev) => ({ ...prev, [pickingOversized]: v })); setPickingOversized(null); }}
                theme={theme} t={t} accent={accent}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}
