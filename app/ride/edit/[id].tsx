import { useState, useEffect, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, Alert, TextInput,
  ActivityIndicator,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useRides } from '@/hooks/useRides';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RidePost } from '@/types';
import { FLORIDA_AIRPORTS, Airport } from '@/constants/florida-airports';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { AirportPicker } from '@/components/ui/AirportPicker';
import { PlaceDetail } from '@/services/googlePlaces';
import { lookupFlight, parseFlightTime, FlightInfo } from '@/services/flightInfo';
import { formatDateInput, formatTimeInput } from '@/utils/dateFormat';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function canEditPost(post: RidePost): boolean {
  return new Date(post.scheduled_at).getTime() - Date.now() > TWO_HOURS_MS;
}

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const { getPostById, updatePost } = useRides();
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  const [original, setOriginal] = useState<RidePost | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  // Form state
  const [originCity, setOriginCity] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [originLat, setOriginLat] = useState<number | undefined>();
  const [originLng, setOriginLng] = useState<number | undefined>();
  const [destinationLat, setDestinationLat] = useState<number | undefined>();
  const [destinationLng, setDestinationLng] = useState<number | undefined>();
  const [isOriginAirport, setIsOriginAirport] = useState(false);
  const [isDestinationAirport, setIsDestinationAirport] = useState(false);
  const [selectedOriginAirport, setSelectedOriginAirport] = useState<Airport | null>(null);
  const [selectedDestinationAirport, setSelectedDestinationAirport] = useState<Airport | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState('');
  const [donation, setDonation] = useState('');
  const [description, setDescription] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [flightLoading, setFlightLoading] = useState(false);
  const flightDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

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

  async function load() {
    try {
      const post = await getPostById(id);
      if (!post || post.user_id !== session?.user?.id) {
        Alert.alert('Error', 'Post not found or unauthorized.');
        router.back();
        return;
      }
      if (!canEditPost(post)) {
        setLocked(true);
        setOriginal(post);
        setPageLoading(false);
        return;
      }
      setOriginal(post);
      prefill(post);
    } catch {
      Alert.alert('Error', 'Could not load post.');
      router.back();
    } finally {
      setPageLoading(false);
    }
  }

  function prefill(post: RidePost) {
    // Detect if addresses match known airports
    const originAirport  = FLORIDA_AIRPORTS.find(a => a.name === post.origin_address) ?? null;
    const destAirport    = FLORIDA_AIRPORTS.find(a => a.name === post.destination_address) ?? null;

    setIsOriginAirport(!!originAirport);
    setSelectedOriginAirport(originAirport);
    setIsDestinationAirport(!!destAirport);
    setSelectedDestinationAirport(destAirport);

    setOriginCity(post.origin_city);
    setOriginAddress(post.origin_address ?? '');
    setOriginLat(post.origin_lat);
    setOriginLng(post.origin_lng);
    setDestinationCity(post.destination_city);
    setDestinationAddress(post.destination_address ?? '');
    setDestinationLat(post.destination_lat);
    setDestinationLng(post.destination_lng);

    const d = new Date(post.scheduled_at);
    setDate(d.toISOString().slice(0, 10));
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    setTime(`${hh}:${mm}`);

    setSeats(post.seats_available != null ? String(post.seats_available) : '');
    setDonation(post.suggested_donation != null ? String(post.suggested_donation) : '');
    setDescription(post.description ?? '');
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

  function toggleOriginAirport(v: boolean) {
    setIsOriginAirport(v);
    setSelectedOriginAirport(null);
    setOriginAddress('');
    setOriginCity('');
    setOriginLat(undefined);
    setOriginLng(undefined);
  }

  function toggleDestinationAirport(v: boolean) {
    setIsDestinationAirport(v);
    setSelectedDestinationAirport(null);
    setDestinationAddress('');
    setDestinationCity('');
    setDestinationLat(undefined);
    setDestinationLng(undefined);
  }

  function applyFlightTime(useArrival: boolean) {
    if (!flightInfo) return;
    const timeStr = useArrival ? flightInfo.arrival.scheduledTime : flightInfo.departure.scheduledTime;
    const parsed = parseFlightTime(timeStr);
    if (parsed) { setDate(parsed.date); setTime(parsed.time); }
  }

  async function handleSave() {
    if (!original) return;
    if (!originCity || !destinationCity || !date || !time) {
      Alert.alert(t.post.requiredFields, t.post.fillRequired);
      return;
    }
    const scheduledAt = new Date(`${date}T${time}:00`);
    if (isNaN(scheduledAt.getTime())) {
      Alert.alert(t.post.invalidDate, t.post.dateFormat);
      return;
    }

    setSaving(true);
    try {
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
          seats_available: original.type === 'offer' && seats ? parseInt(seats, 10) : undefined,
          suggested_donation: donation ? parseFloat(donation) : undefined,
          description: description || undefined,
        },
        original
      );
      Alert.alert('Updated!', 'Your post has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert(t.post.errorTitle, e.message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.border,
    color: theme.text, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontFamily: theme.fontBody, fontSize: 14,
  };

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
        <Icon name="lock" size={40} color={theme.muted} />
        <Text style={{ color: theme.text, fontFamily: theme.fontDisplay, fontSize: 17, marginTop: 16, textAlign: 'center' }}>
          Editing locked
        </Text>
        <Text style={{ color: theme.muted, fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
          Posts can only be edited up to 2 hours before the pickup time.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: theme.primary, borderRadius: 12 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontFamily: theme.fontDisplay }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showFlightPanel = isOriginAirport || isDestinationAirport;
  const isOffer = original?.type === 'offer';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} keyboardShouldPersistTaps="handled">
      <View style={{ paddingHorizontal: 24, paddingBottom: 48, paddingTop: insets.top + 16 }}>

        <Text style={{ fontSize: 16, fontFamily: theme.fontDisplay, color: theme.text, marginBottom: 20 }}>
          Edit post
        </Text>

        {/* Route */}
        <Text style={{ fontSize: 15, fontFamily: theme.fontDisplay, color: theme.text, marginBottom: 12 }}>
          {t.post.route}
        </Text>

        <AirportCheckbox checked={isOriginAirport} onToggle={toggleOriginAirport} label={t.post.originAirport} theme={theme} />
        {isOriginAirport ? (
          <AirportPicker
            selectedAirport={selectedOriginAirport}
            onSelect={handleOriginAirportSelect}
            onClear={() => { setSelectedOriginAirport(null); setOriginAddress(''); setOriginCity(''); setOriginLat(undefined); setOriginLng(undefined); }}
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

        <AirportCheckbox checked={isDestinationAirport} onToggle={toggleDestinationAirport} label={t.post.destinationAirport} theme={theme} />
        {isDestinationAirport ? (
          <AirportPicker
            selectedAirport={selectedDestinationAirport}
            onSelect={handleDestinationAirportSelect}
            onClear={() => { setSelectedDestinationAirport(null); setDestinationAddress(''); setDestinationCity(''); setDestinationLat(undefined); setDestinationLng(undefined); }}
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

        {showFlightPanel && (
          <View style={{
            backgroundColor: theme.primary + '0F',
            borderWidth: 1, borderColor: theme.primary + '33',
            borderRadius: 14, padding: 16, marginBottom: 24,
          }}>
            <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 4 }}>{t.post.flightNumber}</Text>
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
                  {[false, true].map(useArrival => {
                    const side = useArrival ? flightInfo.arrival : flightInfo.departure;
                    return (
                      <TouchableOpacity
                        key={String(useArrival)}
                        style={{ flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}
                        onPress={() => applyFlightTime(useArrival)}
                      >
                        <Text style={{ color: theme.muted, fontSize: 11 }}>{useArrival ? 'ARRIVAL' : 'DEPARTURE'}</Text>
                        <Text style={{ color: theme.text, fontFamily: theme.fontDisplay, fontSize: 13 }}>
                          {side.scheduledTime.split(' ')[1]?.slice(0, 5) ?? '—'}
                        </Text>
                        <Text style={{ color: theme.muted, fontSize: 10 }}>{side.iata}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={{ color: theme.muted, fontSize: 11, textAlign: 'center' }}>Tap to auto-fill date & time</Text>
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
              onChangeText={v => setDate(formatDateInput(v))}
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
              onChangeText={v => setTime(formatTimeInput(v))}
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
              style={[inputStyle, { marginBottom: 16 }]}
              placeholder="1"
              placeholderTextColor={theme.muted}
              keyboardType="number-pad"
              value={seats}
              onChangeText={setSeats}
            />
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
          style={[inputStyle, { marginBottom: 32, textAlignVertical: 'top', minHeight: 80 }]}
          placeholder={t.post.descriptionPlaceholder}
          placeholderTextColor={theme.muted}
          multiline
          numberOfLines={3}
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity
          style={{
            backgroundColor: theme.primary, borderRadius: 16,
            paddingVertical: 16, alignItems: 'center',
            opacity: saving ? 0.7 : 1,
          }}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={{ color: '#fff', fontFamily: theme.fontDisplay, fontSize: 15 }}>
            {saving ? 'Saving...' : 'Save changes'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function AirportCheckbox({ checked, onToggle, label, theme }: {
  checked: boolean; onToggle: (v: boolean) => void; label: string; theme: ReturnType<typeof useTheme>;
}) {
  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginBottom: 8 }}
      onPress={() => onToggle(!checked)}
      activeOpacity={0.7}
    >
      <View style={{
        width: 20, height: 20, borderRadius: 5, borderWidth: 2,
        borderColor: checked ? theme.primary : theme.border,
        backgroundColor: checked ? theme.primary : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <Icon name="check" size={13} color="#fff" />}
      </View>
      <Icon name="navigation" size={13} color={checked ? theme.primary : theme.muted} />
      <Text style={{ color: checked ? theme.primary : theme.textSecondary, fontSize: 14 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function cityFromAddress(formattedAddress: string): string | null {
  const parts = formattedAddress.split(',').map(s => s.trim());
  return parts.length > 1 ? parts[1] : null;
}
