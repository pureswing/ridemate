import { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useRides } from '@/hooks/useRides';
import { useVehicleProfile } from '@/hooks/useVehicleProfile';
import { PostType, ContactMethod, PostVisibility } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Airport } from '@/constants/florida-airports';
import { formatDateInput, formatTimeInput } from '@/utils/dateFormat';
import { lookupFlight, parseFlightTime, FlightInfo } from '@/services/flightInfo';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { AirportPicker } from '@/components/ui/AirportPicker';
import { PlaceDetail } from '@/services/googlePlaces';

export default function PostScreen() {
  const { session } = useAuthStore();
  const { createPost } = useRides();
  const { getMyVehicle } = useVehicleProfile();
  const insets = useSafeAreaInsets();
  const t = useTranslation();
  const theme = useTheme();

  const CONTACT_METHODS: { label: string; value: ContactMethod }[] = [
    { label: t.post.whatsapp, value: 'whatsapp' },
    { label: t.post.phone,    value: 'phone' },
    { label: t.post.email,    value: 'email' },
    { label: t.post.chat,     value: 'in_app' },
  ];

  const [type, setType] = useState<PostType>('offer');

  // Route — cities derived automatically from address or airport selection
  const [originCity, setOriginCity] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [originLat, setOriginLat] = useState<number | undefined>();
  const [originLng, setOriginLng] = useState<number | undefined>();
  const [destinationLat, setDestinationLat] = useState<number | undefined>();
  const [destinationLng, setDestinationLng] = useState<number | undefined>();

  // Airport mode
  const [isOriginAirport, setIsOriginAirport] = useState(false);
  const [isDestinationAirport, setIsDestinationAirport] = useState(false);
  const [selectedOriginAirport, setSelectedOriginAirport] = useState<Airport | null>(null);
  const [selectedDestinationAirport, setSelectedDestinationAirport] = useState<Airport | null>(null);

  // Flight info
  const [flightNumber, setFlightNumber] = useState('');
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [flightLoading, setFlightLoading] = useState(false);
  const flightDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState('1');
  const [vehicleSeats, setVehicleSeats] = useState<number | null>(null);
  const [donation, setDonation] = useState('');
  const [description, setDescription] = useState('');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('whatsapp');
  const [contactValue, setContactValue] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [privateDelayHours, setPrivateDelayHours] = useState(6);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      getMyVehicle(session.user.id, 'rides_courier')
        .then(v => {
          if (v?.seats) {
            setVehicleSeats(v.seats);
            setSeats(String(v.seats));
          }
        })
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

  // Address autocomplete handlers — always derive city from address
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

  // Airport selection handlers
  function handleOriginAirportSelect(airport: Airport) {
    setSelectedOriginAirport(airport);
    setOriginAddress(airport.name);
    setOriginCity(airport.city);
    setOriginLat(airport.lat);
    setOriginLng(airport.lng);
  }

  function handleDestinationAirportSelect(airport: Airport) {
    setSelectedDestinationAirport(airport);
    setDestinationAddress(airport.name);
    setDestinationCity(airport.city);
    setDestinationLat(airport.lat);
    setDestinationLng(airport.lng);
  }

  // Airport checkbox toggles
  function toggleOriginAirport(v: boolean) {
    setIsOriginAirport(v);
    setSelectedOriginAirport(null);
    setOriginAddress('');
    setOriginCity('');
    setOriginLat(undefined);
    setOriginLng(undefined);
    if (!v && !isDestinationAirport) { setFlightNumber(''); setFlightInfo(null); }
  }

  function toggleDestinationAirport(v: boolean) {
    setIsDestinationAirport(v);
    setSelectedDestinationAirport(null);
    setDestinationAddress('');
    setDestinationCity('');
    setDestinationLat(undefined);
    setDestinationLng(undefined);
    if (!v && !isOriginAirport) { setFlightNumber(''); setFlightInfo(null); }
  }

  const isOffer = type === 'offer';
  const canBePrivate = !isOffer;
  const showFlightPanel = isOriginAirport || isDestinationAirport;

  async function handleSubmit() {
    if (!originCity || !destinationCity || !date || !time) {
      Alert.alert(t.post.requiredFields, t.post.fillRequired);
      return;
    }
    if (!contactValue && contactMethod !== 'in_app') {
      Alert.alert(t.post.contactRequired, t.post.enterContact);
      return;
    }

    setLoading(true);
    try {
      const scheduledAt = new Date(`${date}T${time}:00`);
      if (isNaN(scheduledAt.getTime())) {
        Alert.alert(t.post.invalidDate, t.post.dateFormat);
        return;
      }

      const goesPublicAt =
        canBePrivate && visibility === 'private'
          ? new Date(Date.now() + privateDelayHours * 60 * 60 * 1000).toISOString()
          : undefined;

      await createPost({
        user_id: session!.user.id,
        type,
        origin_city: originCity,
        origin_address: originAddress || undefined,
        origin_lat: originLat,
        origin_lng: originLng,
        destination_city: destinationCity,
        destination_address: destinationAddress || undefined,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
        scheduled_at: scheduledAt.toISOString(),
        seats_available: isOffer ? parseInt(seats, 10) : undefined,
        suggested_donation: donation ? parseFloat(donation) : undefined,
        description: description || undefined,
        contact_method: contactMethod,
        contact_value: contactValue || undefined,
        visibility: canBePrivate ? visibility : 'public',
        goes_public_at: goesPublicAt,
      });

      Alert.alert(t.post.successTitle, t.post.successMsg, [
        { text: t.post.viewBoard, onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e: any) {
      Alert.alert(t.post.errorTitle, e.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: theme.fontBody,
    fontSize: 14,
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ paddingHorizontal: 24, paddingBottom: 48, paddingTop: insets.top + 16 }}>

        {/* Post type */}
        <Text style={{ fontSize: 16, fontFamily: theme.fontDisplay, color: theme.text, marginBottom: 12 }}>
          {t.post.whatPost}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          {([['offer', t.post.offerRide, theme.offer, 'car'], ['request', t.post.lookRide, theme.primary, 'person']] as const).map(
            ([val, label, color, iconName]) => (
              <TouchableOpacity
                key={val}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 12,
                  borderWidth: 1, alignItems: 'center',
                  flexDirection: 'row', justifyContent: 'center', gap: 6,
                  backgroundColor: type === val ? color : theme.surface,
                  borderColor: type === val ? color : theme.border,
                }}
                onPress={() => setType(val)}
              >
                <Icon name={iconName} size={15} color={type === val ? '#fff' : theme.text} />
                <Text style={{
                  fontFamily: theme.fontDisplay, fontSize: 13,
                  color: type === val ? '#fff' : theme.text,
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Route */}
        <Text style={{ fontSize: 15, fontFamily: theme.fontDisplay, color: theme.text, marginBottom: 12 }}>
          {t.post.route}
        </Text>

        {/* Origin */}
        <AirportCheckbox
          checked={isOriginAirport}
          onToggle={toggleOriginAirport}
          label={t.post.originAirport}
          theme={theme}
        />
        {isOriginAirport ? (
          <AirportPicker
            selectedAirport={selectedOriginAirport}
            onSelect={handleOriginAirportSelect}
            onClear={() => {
              setSelectedOriginAirport(null);
              setOriginAddress('');
              setOriginCity('');
              setOriginLat(undefined);
              setOriginLng(undefined);
            }}
            style={{ marginBottom: 16 }}
          />
        ) : (
          <AddressAutocomplete
            label={t.post.originAddress}
            placeholder={t.post.originAddressPlaceholder}
            value={originAddress}
            onChangeText={setOriginAddress}
            onSelectPlace={handleOriginPlace}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Destination */}
        <AirportCheckbox
          checked={isDestinationAirport}
          onToggle={toggleDestinationAirport}
          label={t.post.destinationAirport}
          theme={theme}
        />
        {isDestinationAirport ? (
          <AirportPicker
            selectedAirport={selectedDestinationAirport}
            onSelect={handleDestinationAirportSelect}
            onClear={() => {
              setSelectedDestinationAirport(null);
              setDestinationAddress('');
              setDestinationCity('');
              setDestinationLat(undefined);
              setDestinationLng(undefined);
            }}
            style={{ marginBottom: 24 }}
          />
        ) : (
          <AddressAutocomplete
            label={t.post.destinationAddress}
            placeholder={t.post.destinationAddressPlaceholder}
            value={destinationAddress}
            onChangeText={setDestinationAddress}
            onSelectPlace={handleDestinationPlace}
            style={{ marginBottom: 24 }}
          />
        )}

        {/* Flight info panel — only when an airport endpoint is selected */}
        {showFlightPanel && (
          <View style={{
            backgroundColor: theme.primary + '0F',
            borderWidth: 1, borderColor: theme.primary + '33',
            borderRadius: 14, padding: 16, marginBottom: 24,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon name="navigation" size={15} color={theme.primary} />
              <Text style={{ color: theme.primary, fontFamily: theme.fontDisplay, fontSize: 13 }}>
                {selectedOriginAirport
                  ? `${selectedOriginAirport.name} (${selectedOriginAirport.iata})`
                  : selectedDestinationAirport
                  ? `${selectedDestinationAirport.name} (${selectedDestinationAirport.iata})`
                  : 'Airport route'}
                {selectedOriginAirport && selectedDestinationAirport
                  ? ` → ${selectedDestinationAirport.name} (${selectedDestinationAirport.iata})`
                  : ''}
              </Text>
            </View>

            <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 4 }}>
              {t.post.flightNumber}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                style={[inputStyle, { flex: 1 }]}
                placeholder={t.post.flightPlaceholder}
                placeholderTextColor={theme.muted}
                value={flightNumber}
                onChangeText={v => setFlightNumber(v.toUpperCase())}
                autoCapitalize="characters"
              />
              {flightLoading && <ActivityIndicator size="small" color={theme.primary} />}
            </View>

            {flightInfo && (
              <View style={{ marginTop: 12, gap: 6 }}>
                <Text style={{ color: theme.text, fontFamily: theme.fontDisplay, fontSize: 13 }}>
                  {flightInfo.airline} · {flightInfo.flightNumber} · {flightInfo.status}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center',
                      backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                    }}
                    onPress={() => applyFlightTime(false)}
                  >
                    <Text style={{ color: theme.muted, fontSize: 11 }}>DEPARTURE</Text>
                    <Text style={{ color: theme.text, fontFamily: theme.fontDisplay, fontSize: 13 }}>
                      {flightInfo.departure.scheduledTime.split(' ')[1]?.slice(0, 5) ?? '—'}
                    </Text>
                    <Text style={{ color: theme.muted, fontSize: 10 }}>{flightInfo.departure.iata}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center',
                      backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                    }}
                    onPress={() => applyFlightTime(true)}
                  >
                    <Text style={{ color: theme.muted, fontSize: 11 }}>ARRIVAL</Text>
                    <Text style={{ color: theme.text, fontFamily: theme.fontDisplay, fontSize: 13 }}>
                      {flightInfo.arrival.scheduledTime.split(' ')[1]?.slice(0, 5) ?? '—'}
                    </Text>
                    <Text style={{ color: theme.muted, fontSize: 10 }}>{flightInfo.arrival.iata}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ color: theme.muted, fontSize: 11, textAlign: 'center' }}>
                  Tap to auto-fill date & time
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Schedule */}
        <Text style={{ fontSize: 15, fontFamily: theme.fontDisplay, color: theme.text, marginBottom: 12 }}>
          {t.post.schedule}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 4 }}>{t.post.date}</Text>
            <TextInput
              style={inputStyle}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.muted}
              keyboardType="number-pad"
              value={date}
              onChangeText={(v) => setDate(formatDateInput(v))}
              maxLength={10}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 4 }}>{t.post.time}</Text>
            <TextInput
              style={inputStyle}
              placeholder="HH:MM"
              placeholderTextColor={theme.muted}
              keyboardType="number-pad"
              value={time}
              onChangeText={(v) => setTime(formatTimeInput(v))}
              maxLength={5}
            />
          </View>
        </View>

        {/* Details */}
        <Text style={{ fontSize: 15, fontFamily: theme.fontDisplay, color: theme.text, marginBottom: 12 }}>
          {t.post.details}
        </Text>

        {isOffer && (
          <>
            <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 4 }}>{t.post.seats}</Text>
            <TextInput
              style={[inputStyle, { marginBottom: 4 }]}
              placeholder="1"
              placeholderTextColor={theme.muted}
              keyboardType="numeric"
              value={seats}
              onChangeText={setSeats}
            />
            {vehicleSeats != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                <Icon name="seat_recline" size={12} color={theme.muted} />
                <Text style={{ fontSize: 12, color: theme.muted }}>
                  Pre-filled from your vehicle profile · tap to change
                </Text>
              </View>
            ) : (
              <View style={{ marginBottom: 16 }} />
            )}
          </>
        )}

        <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 4 }}>{t.post.donation}</Text>
        <TextInput
          style={[inputStyle, { marginBottom: 16 }]}
          placeholder={t.post.donationPlaceholder}
          placeholderTextColor={theme.muted}
          keyboardType="decimal-pad"
          value={donation}
          onChangeText={setDonation}
        />

        <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 4 }}>{t.post.description}</Text>
        <TextInput
          style={[inputStyle, { marginBottom: 24, textAlignVertical: 'top', minHeight: 80 }]}
          placeholder={t.post.descriptionPlaceholder}
          placeholderTextColor={theme.muted}
          multiline
          numberOfLines={3}
          value={description}
          onChangeText={setDescription}
        />

        {/* Contact */}
        <Text style={{ fontSize: 15, fontFamily: theme.fontDisplay, color: theme.text, marginBottom: 12 }}>
          {t.post.contactSection}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {CONTACT_METHODS.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={{
                paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99,
                borderWidth: 1,
                backgroundColor: contactMethod === m.value ? theme.primary : theme.surface,
                borderColor: contactMethod === m.value ? theme.primary : theme.border,
              }}
              onPress={() => setContactMethod(m.value)}
            >
              <Text style={{
                fontSize: 13, fontFamily: theme.fontDisplay,
                color: contactMethod === m.value ? '#fff' : theme.text,
              }}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {contactMethod !== 'in_app' && (
          <TextInput
            style={[inputStyle, { marginBottom: 24 }]}
            placeholder={
              contactMethod === 'whatsapp' || contactMethod === 'phone'
                ? t.post.phonePlaceholder
                : t.post.emailPlaceholder
            }
            placeholderTextColor={theme.muted}
            keyboardType={contactMethod === 'email' ? 'email-address' : 'phone-pad'}
            value={contactValue}
            onChangeText={setContactValue}
          />
        )}

        <View style={{
          backgroundColor: theme.primary + '1A', borderRadius: 12,
          padding: 16, marginBottom: 24,
        }}>
          <Text style={{ color: theme.primary, fontSize: 13, lineHeight: 20 }}>
            {t.post.contactInfo}
          </Text>
        </View>

        {/* Visibility (rider posts only) */}
        {canBePrivate && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 15, fontFamily: theme.fontDisplay, color: theme.text, marginBottom: 12 }}>
              {t.postVisibility.label}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              {(['public', 'private'] as PostVisibility[]).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={{
                    flex: 1, borderRadius: 12, borderWidth: 1, padding: 12,
                    backgroundColor: visibility === v ? theme.primary : theme.surface,
                    borderColor: visibility === v ? theme.primary : theme.border,
                  }}
                  onPress={() => setVisibility(v)}
                >
                  <Text style={{
                    fontFamily: theme.fontDisplay, fontSize: 13, textAlign: 'center',
                    color: visibility === v ? '#fff' : theme.text,
                  }}>
                    {v === 'public' ? t.postVisibility.public : t.postVisibility.private}
                  </Text>
                  <Text style={{
                    fontSize: 11, textAlign: 'center', marginTop: 4,
                    color: visibility === v ? 'rgba(255,255,255,0.75)' : theme.muted,
                  }}>
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
                    <TouchableOpacity
                      key={h}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99,
                        borderWidth: 1,
                        backgroundColor: privateDelayHours === h ? theme.primary : theme.surface,
                        borderColor: privateDelayHours === h ? theme.primary : theme.border,
                      }}
                      onPress={() => setPrivateDelayHours(h)}
                    >
                      <Text style={{
                        fontSize: 13, fontFamily: theme.fontDisplay,
                        color: privateDelayHours === h ? '#fff' : theme.text,
                      }}>
                        {labels[h]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={{
            backgroundColor: theme.primary, borderRadius: 16,
            paddingVertical: 16, alignItems: 'center',
            opacity: loading ? 0.7 : 1,
          }}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={{ color: '#fff', fontFamily: theme.fontDisplay, fontSize: 15 }}>
            {loading ? t.post.publishing : t.post.publish}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Inline checkbox component — needs theme from parent scope via props
function AirportCheckbox({
  checked, onToggle, label, theme,
}: {
  checked: boolean;
  onToggle: (v: boolean) => void;
  label: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginBottom: 8 }}
      onPress={() => onToggle(!checked)}
      activeOpacity={0.7}
    >
      <View style={{
        width: 20, height: 20, borderRadius: 5,
        borderWidth: 2,
        borderColor: checked ? theme.primary : theme.border,
        backgroundColor: checked ? theme.primary : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <Icon name="check" size={13} color="#fff" />}
      </View>
      <Icon name="navigation" size={13} color={checked ? theme.primary : theme.muted} />
      <Text style={{ color: checked ? theme.primary : theme.textSecondary, fontSize: 14 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function cityFromAddress(formattedAddress: string): string | null {
  const parts = formattedAddress.split(',').map(s => s.trim());
  // "123 Main St, Miami, FL 33101, USA" → parts[1] = "Miami"
  return parts.length > 1 ? parts[1] : null;
}

