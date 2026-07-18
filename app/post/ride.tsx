import { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Alert, TextInput, ActivityIndicator, Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { CardBox } from '@/components/ui/CardBox';
import { RuleChip } from '@/components/ui/RuleChip';
import { KindCard } from '@/components/ui/KindCard';
import { StepRow } from '@/components/ui/StepRow';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { RowDivider } from '@/components/ui/RowDivider';
import { DelayBadge } from '@/components/ui/DelayBadge';
import { Segmented } from '@/components/ui/Segmented';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { OversizedSheet } from '@/components/ui/OversizedSheet';
import { SmartAddressField } from '@/components/ui/SmartAddressField';
import { RouteMapPlaceholder } from '@/components/ride/RouteMapPlaceholder';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useRides } from '@/hooks/useRides';
import { useVehicleProfile } from '@/hooks/useVehicleProfile';
import { PostType, ContactMethod, PostVisibility, RidePostDetailsRide, RouteStats } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Airport } from '@/constants/florida-airports';
import { lookupFlight, parseFlightTime, FlightInfo } from '@/services/flightInfo';
import { generateRouteMapImage } from '@/services/routeMap';
import { AirportPicker } from '@/components/ui/AirportPicker';
import { PlaceDetail } from '@/services/googlePlaces';
import { cityFromAddress } from '@/utils/address';
import { IconName } from '@/constants/icons';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, leading, letterSpacingFor } from '@/constants/typography';
import { RULES, VEHICLE_TYPES, COMFORT_PREFS, CLIMATE_PREFS, SPECIFIC_TEMP, CHILD_SEAT_OPTIONS } from '@/constants/rideFormOptions';

export default function PostRideScreen() {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const { createPost, uploadRouteMap, getRoutePriceStats } = useRides();
  const { getMyVehicle } = useVehicleProfile();

  const CONTACT_METHODS: { label: string; value: ContactMethod }[] = [
    { label: t.post.whatsapp, value: 'whatsapp' },
    { label: t.post.phone, value: 'phone' },
    { label: t.post.email, value: 'email' },
    { label: t.post.chat, value: 'in_app' },
  ];

  // â”€â”€ I'm offering / looking for â”€â”€
  const [type, setType] = useState<PostType>('offer');
  const isDriver = type === 'offer';
  const accent = isDriver ? theme.driverText : theme.primary;
  const accentSoft = isDriver ? theme.driverSoft : theme.passengerSoft;

  // â”€â”€ Trip type (passenger only): regular vs event â”€â”€
  const [isEvent, setIsEvent] = useState(false);
  const [eventName, setEventName] = useState('');
  const [vehiclesNeeded, setVehiclesNeeded] = useState(3);

  // â”€â”€ Route â”€â”€
  const [originCity, setOriginCity] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [originLat, setOriginLat] = useState<number | undefined>();
  const [originLng, setOriginLng] = useState<number | undefined>();
  const [destinationLat, setDestinationLat] = useState<number | undefined>();
  const [destinationLng, setDestinationLng] = useState<number | undefined>();
  const [roundTrip, setRoundTrip] = useState(false);
  // Visual only â€” matches the design system's PostRide.jsx waypoints list, but
  // `details` has no `stops` field (see types/index.ts's RidePostDetailsRide)
  // and isn't submitted; this is UI-completeness, not a real itinerary feature yet.
  const [stops, setStops] = useState<string[]>([]);

  // â”€â”€ Address book (origin/destination "saved address" picker) â€” visual
  // only, session-local state, same as profile/edit.tsx's own Address Book
  // (which also has no Supabase persistence yet â€” see that screen's
  // slotValues). Shared between the origin and destination fields below,
  // matching the single address-book concept in the design system. â”€â”€
  const ADDRESS_BOOK_SLOTS: { id: string; label: string; icon: IconName }[] = [
    { id: 'home', label: t.profile.addressHome, icon: 'addr_home' },
    { id: 'work', label: t.profile.addressWork, icon: 'addr_work' },
    { id: 'addr1', label: `${t.profile.addressSlot} 1`, icon: 'addr_general' },
    { id: 'addr2', label: `${t.profile.addressSlot} 2`, icon: 'addr_general' },
    { id: 'addr3', label: `${t.profile.addressSlot} 3`, icon: 'addr_general' },
  ];
  const [addressBook, setAddressBook] = useState<Record<string, string>>({});
  const savedAddresses = ADDRESS_BOOK_SLOTS.filter((s) => addressBook[s.id]).map((s) => ({ ...s, value: addressBook[s.id] }));
  const emptyAddressSlots = ADDRESS_BOOK_SLOTS.filter((s) => !addressBook[s.id]);
  function saveAddressToSlot(slotId: string, value: string) {
    setAddressBook((prev) => ({ ...prev, [slotId]: value }));
  }

  // â”€â”€ Airport mode â”€â”€
  const [isOriginAirport, setIsOriginAirport] = useState(false);
  const [isDestinationAirport, setIsDestinationAirport] = useState(false);
  const [selectedOriginAirport, setSelectedOriginAirport] = useState<Airport | null>(null);
  const [selectedDestinationAirport, setSelectedDestinationAirport] = useState<Airport | null>(null);
  const airport = isOriginAirport || isDestinationAirport;
  const airportLeg: 'to' | 'from' = isDestinationAirport ? 'to' : 'from';

  // â”€â”€ Flight â”€â”€
  const [flightNumber, setFlightNumber] = useState('');
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [flightLoading, setFlightLoading] = useState(false);
  const flightDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // â”€â”€ Schedule â”€â”€
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // â”€â”€ Who's riding â”€â”€
  const [seats, setSeats] = useState(2);
  const [vehicleSeats, setVehicleSeats] = useState<number | null>(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [childSeatPrefs, setChildSeatPrefs] = useState<string[]>([]);

  // â”€â”€ Luggage â”€â”€
  const [bags, setBags] = useState(0);
  const [bagTypes, setBagTypes] = useState<string[]>([]);
  const [oversizedInfo, setOversizedInfo] = useState<Record<number, { types: string[]; other: string }>>({});
  const [pickingOversized, setPickingOversized] = useState<number | null>(null);

  // â”€â”€ Price â”€â”€
  const [donation, setDonation] = useState('');
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
  const routeStatsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // rateBasis/priceMode are visual only, same reasoning as `stops` above â€” no
  // hourly rate or counter-offer-mode column exists on ride_posts, and the
  // app's real counter-offer mechanic already lives in messaging (Send Offer
  // on any post), independent of how the creator priced it here.
  const [rateBasis, setRateBasis] = useState<'trip' | 'hourly'>('trip');
  const [priceMode, setPriceMode] = useState<'firm' | 'open'>('firm');

  // â”€â”€ Vehicle (driver, free text) â€” visual only, no schema field; the app's
  // real vehicle data lives in the separate Vehicle Profile system. â”€â”€
  const [vehicle, setVehicle] = useState('');

  // â”€â”€ Passenger vehicle/comfort/climate prefs â”€â”€
  const [vehicleType, setVehicleType] = useState('No preference');
  const [comfortPrefs, setComfortPrefs] = useState<string[]>([]);
  const [climatePrefs, setClimatePrefs] = useState<string[]>([]);
  const [tempPref, setTempPref] = useState(72);

  // â”€â”€ Rules / note â”€â”€
  const [rules, setRules] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');

  // â”€â”€ Contact / visibility â”€â”€
  const [contactMethod, setContactMethod] = useState<ContactMethod>('whatsapp');
  const [contactValue, setContactValue] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [privateDelayHours, setPrivateDelayHours] = useState(6);

  const [loading, setLoading] = useState(false);
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      getMyVehicle(session.user.id, 'rides_courier')
        .then((v) => { if (v?.seats) { setVehicleSeats(v.seats); setSeats(v.seats); } })
        .catch(() => {});
    }
  }, []);

  // Auto-lookup flight when number is entered (only when an airport is selected)
  useEffect(() => {
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

  // Real historical average for this route (supabase/migrations/009) â€” fetched
  // once both cities have settled (debounced), not on every keystroke.
  useEffect(() => {
    if (routeStatsDebounce.current) clearTimeout(routeStatsDebounce.current);
    if (!originCity.trim() || !destinationCity.trim()) { setRouteStats(null); return; }
    routeStatsDebounce.current = setTimeout(async () => {
      try { setRouteStats(await getRoutePriceStats(originCity, destinationCity)); }
      catch { setRouteStats(null); }
    }, 500);
  }, [originCity, destinationCity]);

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

  const ready = !!(originCity.trim() && destinationCity.trim() && date.trim() && time.trim());

  async function handleSubmit() {
    if (!ready) {
      Alert.alert(t.post.requiredFields, t.post.fillRequired);
      return;
    }
    if (!contactValue && contactMethod !== 'in_app') {
      Alert.alert(t.post.contactRequired, t.post.enterContact);
      return;
    }
    const scheduledAt = new Date(`${date}T${time}:00`);
    if (isNaN(scheduledAt.getTime())) {
      Alert.alert(t.post.invalidDate, t.post.dateFormat);
      return;
    }

    const details: RidePostDetailsRide = {
      rules,
      bags,
      bagTypes,
      oversizedInfo: Object.values(oversizedInfo),
      ...(isDriver ? {} : {
        vehicleType,
        comfortPrefs,
        climatePrefs,
        ...(climatePrefs.includes(SPECIFIC_TEMP) ? { tempPref } : {}),
        adults,
        children,
        ...(children > 0 ? { childSeatPrefs } : {}),
      }),
      ...(isEvent ? { eventName, vehiclesNeeded } : {}),
    };

    setLoading(true);
    try {
      const goesPublicAt = visibility === 'private'
        ? new Date(Date.now() + privateDelayHours * 60 * 60 * 1000).toISOString()
        : undefined;

      // Generated once here, at creation â€” RouteMap.tsx just displays this
      // stored image, it never re-fetches from Google on its own.
      let routeMapUrl: string | undefined;
      if (originLat != null && originLng != null && destinationLat != null && destinationLng != null) {
        const image = await generateRouteMapImage({ lat: originLat, lng: originLng }, { lat: destinationLat, lng: destinationLng });
        if (image) routeMapUrl = (await uploadRouteMap(session!.user.id, image)) ?? undefined;
      }

      await createPost({
        user_id: session!.user.id,
        type: isEvent ? 'request' : type,
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
        contact_method: contactMethod,
        contact_value: contactValue || undefined,
        visibility,
        goes_public_at: goesPublicAt,
        round_trip: roundTrip,
        airport,
        airport_leg: airport ? airportLeg : undefined,
        flight_number: airport && flightNumber ? flightNumber : undefined,
        route_map_url: routeMapUrl,
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
        <LinearGradient
          colors={theme.gradientGold as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="check" size={44} color={theme.textOnPrimary} strokeWidth={2.6} />
        </LinearGradient>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: letterSpacingFor(26, tracking.tight), color: theme.text, textAlign: 'center' }}>
            {t.post.postedTitle}
          </Text>
          <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 14.5, color: theme.muted, marginTop: 6, maxWidth: 260, textAlign: 'center' }}>
            {isDriver ? t.post.postedDriverMsg : t.post.postedPassengerMsg}
          </Text>
        </View>
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
        style={{ paddingTop: insets.top + 8, paddingBottom: 20, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <IconButton icon="close" variant="glass" label={t.post.close} onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {t.post.rideFormTitle}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 10, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: letterSpacingFor(26, tracking.tight), color: theme.cream, textAlign: 'center' }}>
            {isDriver ? 'Offer a ' : 'Find a '}
            <Text style={{ fontFamily: fonts.bodyItalic, color: theme.driverText }}>ride</Text>
          </Text>
        </View>
      </LinearGradient>

      {/* removeClippedSubviews={false} — Android's default clipping of
          off-screen ScrollView content can leave touch handlers stale for
          content below the fold until a native scroll event forces a
          re-layout; this is the documented fix for exactly that symptom
          (works once visible, then unresponsive until you scroll). */}
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" removeClippedSubviews={false} contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 100 }}>
        {/* I'm offering / looking */}
        <Field label={t.post.imTitle}>
          <Segmented
            options={[{ value: 'offer' as const, label: t.post.imOffering }, { value: 'request' as const, label: t.post.imLooking }]}
            value={type} onChange={setType} theme={theme}
          />
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
              <Input
                placeholder={t.post.eventNamePlaceholder}
                value={eventName}
                onChangeText={setEventName}
              />
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
                savedAddresses={savedAddresses} emptySlots={emptyAddressSlots} onSaveToSlot={saveAddressToSlot}
                theme={theme} t={t}
              />
            )}

            {stops.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Input
                  containerStyle={{ flex: 1 }}
                  placeholder={`${t.post.stopPlaceholder} ${i + 1} (${t.post.optional})`}
                  value={s}
                  onChangeText={(v) => setStops((prev) => prev.map((x, idx) => (idx === i ? v : x)))}
                />
                <TouchableOpacity
                  onPress={() => setStops((prev) => prev.filter((_, idx) => idx !== i))}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="close" size={14} color={theme.textFaint} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              {stops.length < 10 && (
                <TouchableOpacity
                  onPress={() => setStops((prev) => [...prev, ''])}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1.5, borderColor: theme.border, borderStyle: 'dashed' }}
                >
                  <Icon name="location" size={14} color={theme.muted} />
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: theme.muted }}>
                    {t.post.addStop}{stops.length > 0 ? ` (${stops.length}/10)` : ''}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setRoundTrip((v) => !v)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: radii.pill,
                  backgroundColor: roundTrip ? accent : 'transparent',
                  borderWidth: 1.5, borderColor: roundTrip ? accent : theme.border,
                }}
              >
                <Icon name="loop" size={14} color={roundTrip ? '#fff' : theme.muted} />
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: roundTrip ? '#fff' : theme.muted }}>{t.post.roundTrip}</Text>
              </TouchableOpacity>
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
                  {flightInfo.airline} Â· {flightInfo.flightNumber} Â· {flightInfo.status}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => applyFlightTime(false)} style={{ flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
                    <Text style={{ color: theme.muted, fontSize: 11 }}>DEPARTURE</Text>
                    <Text style={{ color: theme.text, fontFamily: fonts.bodyBold, fontSize: 13 }}>{flightInfo.departure.scheduledTime.split(' ')[1]?.slice(0, 5) ?? 'â€”'}</Text>
                    <DelayBadge minutes={flightInfo.departure.delayMinutes} theme={theme} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => applyFlightTime(true)} style={{ flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
                    <Text style={{ color: theme.muted, fontSize: 11 }}>ARRIVAL</Text>
                    <Text style={{ color: theme.text, fontFamily: fonts.bodyBold, fontSize: 13 }}>{flightInfo.arrival.scheduledTime.split(' ')[1]?.slice(0, 5) ?? 'â€”'}</Text>
                    <DelayBadge minutes={flightInfo.arrival.delayMinutes} theme={theme} />
                  </TouchableOpacity>
                </View>
                {(flightInfo.departure.terminal || flightInfo.departure.gate || flightInfo.arrival.terminal || flightInfo.arrival.gate) && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ flex: 1, fontSize: 11, color: theme.muted, textAlign: 'center' }}>
                      {[flightInfo.departure.terminal && `Terminal ${flightInfo.departure.terminal}`, flightInfo.departure.gate && `Gate ${flightInfo.departure.gate}`].filter(Boolean).join(' Â· ') || 'â€”'}
                    </Text>
                    <Text style={{ flex: 1, fontSize: 11, color: theme.muted, textAlign: 'center' }}>
                      {[flightInfo.arrival.terminal && `Terminal ${flightInfo.arrival.terminal}`, flightInfo.arrival.gate && `Gate ${flightInfo.arrival.gate}`].filter(Boolean).join(' Â· ') || 'â€”'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Route map â€” decorative placeholder, no real map SDK behind it */}
        <Field label={t.post.routeMap} hint={t.post.optional}>
          <RouteMapPlaceholder accent={accent} theme={theme} label={t.post.addNavigationMap} />
        </Field>

        {/* Date + time â€” tap opens the device's own calendar / clock picker */}
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
            {vehicleSeats != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                <Icon name="seat_recline" size={12} color={theme.muted} />
                <Text style={{ fontSize: 12, color: theme.muted }}>Pre-filled from your vehicle profile Â· tap to change</Text>
              </View>
            )}
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
              <Field label={t.post.childSeat} hint={t.post.selectAllApplied}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {CHILD_SEAT_OPTIONS.map((c) => (
                    <RuleChip key={c} active={childSeatPrefs.includes(c)} onPress={() => toggleExclusive(childSeatPrefs, setChildSeatPrefs, c, 'No child seat needed')} accent={accent} theme={theme}>{c}</RuleChip>
                  ))}
                </View>
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint, lineHeight: 16, marginTop: 10 }}>{t.post.childSeatWarning}</Text>
              </Field>
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
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {[t.post.bagCarryOn, t.post.bagChecked, t.post.bagOversized].map((b) => (
                        <RuleChip key={b} active={(bagTypes[i] || t.post.bagCarryOn) === b} accent={accent} theme={theme}
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
              value={donation}
              onChangeText={(v) => setDonation(v.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              placeholder="$0"
              rightElement={
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11.5, color: theme.textFaint }}>
                  {rateBasis === 'hourly' ? '/ hour' : (priceMode === 'firm' ? t.post.priceFixed : t.post.priceStarting)}
                </Text>
              }
            />
            {originCity.trim() && destinationCity.trim() && (
              routeStats && routeStats.sample_size >= 3 && routeStats.avg_donation != null ? (
                <View style={{ borderRadius: 14, borderWidth: 1.5, borderColor: theme.borderGold, backgroundColor: theme.badgeWarnBg + '55', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="pageinfo" size={15} color={theme.badgeWarnFg} />
                  <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.text, lineHeight: 17 }}>
                    {t.post.priceRouteAvgPrefix} <Text style={{ fontFamily: fonts.bodyBold }}>${routeStats.avg_donation}</Text> ({routeStats.sample_size} posts)
                  </Text>
                </View>
              ) : (
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint, lineHeight: 16 }}>{t.post.priceNotEnoughData}</Text>
              )
            )}
          </View>
        </Field>

        {/* Vehicle (driver, free text) */}
        {isDriver && (
          <Field label={t.post.vehicle} hint={t.post.optional}>
            <Input icon="car" value={vehicle} onChangeText={setVehicle} placeholder={t.post.vehiclePlaceholder} />
          </Field>
        )}

        {/* Vehicle type / comfort / climate (passenger only) */}
        {!isDriver && (
          <Field label={t.post.vehicleTypeLabel} hint={t.post.selectAllApplied}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {VEHICLE_TYPES.map((v) => (
                <RuleChip key={v} active={vehicleType === v} onPress={() => setVehicleType(v)} accent={accent} theme={theme}>{v}</RuleChip>
              ))}
            </View>
          </Field>
        )}
        {!isDriver && (
          <Field label={t.post.comfortSeating} hint={t.post.selectAllApplied}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {COMFORT_PREFS.map((c) => (
                <RuleChip key={c} active={comfortPrefs.includes(c)} onPress={() => toggleExclusive(comfortPrefs, setComfortPrefs, c, 'No preference')} accent={accent} theme={theme}>{c}</RuleChip>
              ))}
            </View>
          </Field>
        )}
        {!isDriver && (
          <Field label={t.post.climateControl} hint={t.post.selectAllApplied}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CLIMATE_PREFS.map((c) => (
                <RuleChip key={c} active={climatePrefs.includes(c)} onPress={() => toggleExclusive(climatePrefs, setClimatePrefs, c, 'No preference')} accent={accent} theme={theme}>{c}</RuleChip>
              ))}
              <RuleChip active={climatePrefs.includes(SPECIFIC_TEMP)} accent={accent} theme={theme}
                onPress={() => setClimatePrefs((prev) => { const w = prev.filter((x) => x !== 'No preference'); return w.includes(SPECIFIC_TEMP) ? w.filter((x) => x !== SPECIFIC_TEMP) : [...w, SPECIFIC_TEMP]; })}
              >{SPECIFIC_TEMP}</RuleChip>
            </View>
            {climatePrefs.includes(SPECIFIC_TEMP) && (
              <CardBox style={{ marginTop: 10 }}>
                <StepRow icon="thermometer" label={t.post.targetTemp} sub="Â°F" value={tempPref} min={60} max={80} onDec={() => setTempPref((v) => Math.max(60, v - 1))} onInc={() => setTempPref((v) => Math.min(80, v + 1))} theme={theme} />
              </CardBox>
            )}
          </Field>
        )}

        {/* Ride rules */}
        <Field label={isDriver ? t.post.rideRules : t.post.preferences} hint={t.post.tapToToggle}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {RULES.map((r) => (
              <RuleChip key={r} active={!!rules[r]} onPress={() => setRules((p) => ({ ...p, [r]: !p[r] }))} accent={accent} theme={theme}>{r}</RuleChip>
            ))}
          </View>
        </Field>

        {/* Note */}
        <Field label={t.post.note} hint={t.post.optional}>
          <View style={{ backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border, borderRadius: 14, padding: 14, ...shadows.xs }}>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              placeholder={isDriver ? t.post.notePlaceholderDriver : t.post.notePlaceholderPassenger}
              placeholderTextColor={theme.muted}
              style={{ fontFamily: fonts.bodyMedium, fontSize: 14.5, color: theme.text, minHeight: 80, textAlignVertical: 'top' }}
            />
          </View>
        </Field>

        {/* Contact */}
        <Field label={t.post.contactSection}>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CONTACT_METHODS.map((m) => (
                <RuleChip key={m.value} active={contactMethod === m.value} onPress={() => setContactMethod(m.value)} accent={accent} theme={theme}>{m.label}</RuleChip>
              ))}
            </View>
            {contactMethod !== 'in_app' && (
              <Input
                placeholder={contactMethod === 'whatsapp' || contactMethod === 'phone' ? t.post.phonePlaceholder : t.post.emailPlaceholder}
                keyboardType={contactMethod === 'email' ? 'email-address' : 'phone-pad'}
                value={contactValue}
                onChangeText={setContactValue}
              />
            )}
            <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>{t.post.contactInfo}</Text>
          </View>
        </Field>

        {/* Visibility */}
        {!isDriver && (
          <Field label={t.postVisibility.label}>
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {(['public', 'private'] as PostVisibility[]).map((v) => (
                  <TouchableOpacity key={v} onPress={() => setVisibility(v)}
                    style={{ flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, backgroundColor: visibility === v ? theme.primary : theme.surface, borderColor: visibility === v ? theme.primary : theme.border }}
                  >
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, textAlign: 'center', color: visibility === v ? '#fff' : theme.text }}>
                      {v === 'public' ? t.postVisibility.public : t.postVisibility.private}
                    </Text>
                    <Text style={{ fontSize: 11, textAlign: 'center', marginTop: 4, color: visibility === v ? 'rgba(255,255,255,0.75)' : theme.muted }}>
                      {v === 'public' ? t.postVisibility.publicDesc : t.postVisibility.privateDesc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {visibility === 'private' && (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {([2, 6, 12, 24] as const).map((h) => {
                    const labels = { 2: t.postVisibility.delay2h, 6: t.postVisibility.delay6h, 12: t.postVisibility.delay12h, 24: t.postVisibility.delay24h };
                    return (
                      <RuleChip key={h} active={privateDelayHours === h} onPress={() => setPrivateDelayHours(h)} accent={accent} theme={theme}>{labels[h]}</RuleChip>
                    );
                  })}
                </View>
              )}
            </View>
          </Field>
        )}
      </ScrollView>

      {/* sticky submit */}
      <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, backgroundColor: theme.surface, padding: 16, paddingBottom: insets.bottom + 16 }}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!ready || loading}
          style={{ backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', opacity: !ready || loading ? 0.6 : 1 }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={{ color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 }}>
              {isDriver ? t.post.postRideOffer : isEvent ? t.post.requestEventRides : t.post.postRideRequest}
            </Text>
          )}
        </TouchableOpacity>
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
