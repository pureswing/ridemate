import { useState, useEffect } from 'react';
import {
  View, Modal, TouchableOpacity, TextInput, ScrollView,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { useVehicleProfile } from '@/hooks/useVehicleProfile';
import { VehicleProfile, VehicleAmenity, AmenityDetails } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { IconName } from '@/constants/icons';

const AMENITY_CHOICES: Partial<Record<VehicleAmenity, string[]>> = {
  ev_station:    ['USB-C', 'Lightning', 'Wireless', 'USB-B', 'USB-A', 'AC Output'],
  bluetooth:     ['Car Speakers', 'Aux Cable'],
  wifi:          ['Hotspot', 'Mobile Data'],
  seat_heater:   ['Front', 'Rear', 'All Seats'],
  baby_seat:     ['Infant', 'Convertible', 'Booster'],
  pets_ok:       ['Dogs', 'Cats', 'Small Pets Only'],
  music_ok:      ['Electronic','Pop', 'Latin', 'Rock', 'Hip-Hop', 'Jazz', 'Classical'],
  ac_unit:       ['Front Only', 'Front & Rear', 'Individual Controls'],
  glass_cocktail:['Water', 'Soda', 'Juice', 'Alcoholic'],
  dashcam:       ['Exterior', 'Interior', 'Video Only', 'Video + Audio'],
};

const AMENITY_GROUPS: { label: string; items: { key: VehicleAmenity; label: string }[] }[] = [
  {
    label: 'Charging & Tech',
    items: [
      { key: 'ev_station',    label: 'Charger' },
      { key: 'bluetooth',     label: 'Bluetooth' },
      { key: 'wifi',          label: 'WiFi' },
      { key: 'dashcam',       label: 'Dashcam' },
    ],
  },
  {
    label: 'Comfort',
    items: [
      { key: 'seat_recline',  label: 'Comfort Seat' },
      { key: 'seat_heater',   label: 'Seat Heater' },
      { key: 'baby_seat',     label: 'Baby Seat' },
      { key: 'ac_unit',       label: 'A/C' },
      { key: 'accessible',    label: 'Accessible' },
    ],
  },
  {
    label: 'Vibe',
    items: [
      { key: 'music_ok',      label: 'Music' },
      { key: 'quiet_ride',    label: 'Quiet Ride' },
      { key: 'celebration',   label: 'Celebration' },
      { key: 'glass_cocktail',label: 'Bar' },
      { key: 'hand_wash',     label: 'Clean Hands' },
    ],
  },
  {
    label: 'Rules',
    items: [
      { key: 'smoke_free',    label: 'No Smoking' },
      { key: 'smoking',       label: 'Smoking OK' },
      { key: 'vape_free',     label: 'No Vaping' },
      { key: 'cannabis_free', label: 'No Cannabis' },
      { key: 'cannabis_ok',   label: 'Cannabis OK' },
      { key: 'food_off',      label: 'No Fast Food' },
      { key: 'no_pets',       label: 'No Pets' },
      { key: 'pets_ok',       label: 'Pets OK' },
    ],
  },
];

const FUEL_TYPES: { label: string; icon: IconName }[] = [
  { label: 'Gas',            icon: 'fuel' },
  { label: 'Electric',       icon: 'ev_station' },
  { label: 'Hybrid',         icon: 'hybrid' },
  { label: 'Plug-in Hybrid', icon: 'ev_station' },
  { label: 'Diesel',         icon: 'oil_barrel' },
  { label: 'Flex-Fuel',      icon: 'loop' },
];

function mapFuelType(raw: string): string {
  if (!raw) return '';
  const r = raw.toLowerCase();
  if (r.includes('plug') && (r.includes('hybrid') || r.includes('electric'))) return 'Plug-in Hybrid';
  if (r.includes('hybrid')) return 'Hybrid';
  if (r.includes('electric')) return 'Electric';
  if (r.includes('diesel')) return 'Diesel';
  if (r.includes('flex') || r.includes('ffv')) return 'Flex-Fuel';
  return 'Gas';
}

interface Props {
  visible: boolean;
  userId: string;
  existing: VehicleProfile | null;
  onSaved: (v: VehicleProfile) => void;
  onClose: () => void;
}

export function EditVehicleModal({ visible, userId, existing, onSaved, onClose }: Props) {
  const t = useTranslation();
  const theme = useTheme();
  const { upsertVehicle, uploadVehiclePhoto, loading } = useVehicleProfile();

  const [vin, setVin] = useState(existing?.vin ?? '');
  const [vinDecoding, setVinDecoding] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);

  const [make, setMake] = useState(existing?.make ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [trim, setTrim] = useState(existing?.trim ?? '');
  const [year, setYear] = useState(existing?.year?.toString() ?? '');
  const [color, setColor] = useState(existing?.color ?? '');
  const [fuelType, setFuelType] = useState(existing?.fuel_type ?? '');
  const [seats, setSeats] = useState(existing?.seats?.toString() ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(existing?.photo_url ?? null);
  const [amenities, setAmenities] = useState<Set<VehicleAmenity>>(new Set(existing?.amenities ?? []));
  const [amenityDetails, setAmenityDetails] = useState<Map<VehicleAmenity, { choices: string[]; note: string }>>(
    () => new Map(Object.entries(existing?.amenity_details ?? {}) as [VehicleAmenity, { choices: string[]; note: string }][])
  );
  const [expandedAmenity, setExpandedAmenity] = useState<VehicleAmenity | null>(null);
  const [insured, setInsured] = useState(existing?.insurance_self_certified ?? false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (visible) {
      setVin(existing?.vin ?? '');
      setVinDecoded(false);
      setMake(existing?.make ?? '');
      setModel(existing?.model ?? '');
      setTrim(existing?.trim ?? '');
      setYear(existing?.year?.toString() ?? '');
      setColor(existing?.color ?? '');
      setFuelType(existing?.fuel_type ?? '');
      setSeats(existing?.seats?.toString() ?? '');
      setPhotoUri(existing?.photo_url ?? null);
      setAmenities(new Set(existing?.amenities ?? []));
      setAmenityDetails(new Map(Object.entries(existing?.amenity_details ?? {}) as [VehicleAmenity, { choices: string[]; note: string }][]));
      setExpandedAmenity(null);
      setInsured(existing?.insurance_self_certified ?? false);
    }
  }, [visible]);

  async function decodeVin(rawVin: string) {
    const v = rawVin.trim().toUpperCase();
    if (v.length !== 17) return;
    setVinDecoding(true);
    try {
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${v}?format=json`
      );
      const json = await res.json();
      const get = (name: string): string =>
        json.Results?.find((r: any) => r.Variable === name)?.Value ?? '';

      const decodedMake = get('Make');
      const decodedModel = get('Model');
      const decodedYear = get('Model Year');
      const decodedTrim = get('Trim');
      const decodedFuel = get('Fuel Type - Primary');

      if (!decodedMake || decodedMake === 'null') {
        Alert.alert('VIN not found', 'Could not decode this VIN. You can fill in the details manually.');
        return;
      }

      if (decodedMake) setMake(decodedMake);
      if (decodedModel) setModel(decodedModel);
      if (decodedYear) setYear(decodedYear);
      if (decodedTrim && decodedTrim !== 'null') setTrim(decodedTrim);
      if (decodedFuel && decodedFuel !== 'null') setFuelType(mapFuelType(decodedFuel));

      const totalSeats = parseInt(get('Seats'), 10);
      if (!isNaN(totalSeats) && totalSeats > 1) setSeats(String(totalSeats - 1));

      setVinDecoded(true);
    } catch {
      Alert.alert('Error', 'Could not reach the vehicle database. Check your connection.');
    } finally {
      setVinDecoding(false);
    }
  }

  function handleVinChange(text: string) {
    const v = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
    setVin(v);
    setVinDecoded(false);
    if (v.length === 17) decodeVin(v);
  }

  function toggleAmenity(a: VehicleAmenity) {
    setAmenities(prev => {
      const next = new Set(prev);
      if (next.has(a)) {
        next.delete(a);
        setExpandedAmenity(e => e === a ? null : e);
      } else {
        next.add(a);
        setExpandedAmenity(a);
      }
      return next;
    });
  }

  function toggleAmenityChoice(amenity: VehicleAmenity, choice: string) {
    setAmenityDetails(prev => {
      const next = new Map(prev);
      const cur = next.get(amenity) ?? { choices: [], note: '' };
      const choices = cur.choices.includes(choice)
        ? cur.choices.filter(c => c !== choice)
        : [...cur.choices, choice];
      next.set(amenity, { ...cur, choices });
      return next;
    });
  }

  function setAmenityNote(amenity: VehicleAmenity, note: string) {
    setAmenityDetails(prev => {
      const next = new Map(prev);
      const cur = next.get(amenity) ?? { choices: [], note: '' };
      next.set(amenity, { ...cur, note });
      return next;
    });
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to add a vehicle photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 7],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!make.trim() || !model.trim() || !year.trim() || !color.trim()) {
      Alert.alert('Required fields', 'Please fill in make, model, year, and color.');
      return;
    }
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 1980 || yearNum > 2030) {
      Alert.alert('Invalid year', 'Enter a valid year between 1980 and 2030.');
      return;
    }
    try {
      let finalPhotoUrl: string | undefined = existing?.photo_url;
      if (photoUri && !photoUri.startsWith('http')) {
        setUploading(true);
        finalPhotoUrl = await uploadVehiclePhoto(userId, photoUri);
        setUploading(false);
      }
      const detailsObj: AmenityDetails = {};
      amenityDetails.forEach((v, k) => {
        if (amenities.has(k) && (v.choices.length > 0 || v.note.trim())) {
          detailsObj[k] = v;
        }
      });
      const saved = await upsertVehicle(userId, {
        vin: vin.trim() || undefined,
        make: make.trim(),
        model: model.trim(),
        trim: trim.trim() || undefined,
        year: yearNum,
        color: color.trim(),
        fuel_type: fuelType || undefined,
        seats: seats ? parseInt(seats, 10) : undefined,
        photo_url: finalPhotoUrl,
        amenities: Array.from(amenities),
        amenity_details: detailsObj,
        insurance_self_certified: insured,
      });
      onSaved(saved);
    } catch (e: any) {
      setUploading(false);
      Alert.alert('Error', e.message);
    }
  }

  const isBusy = loading || uploading;
  const btnTextColor = '#fff';

  const cardShadow = {
    shadowColor: theme.cardShadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.cardShadowOpacity,
    shadowRadius: 8,
    elevation: 4,
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ padding: 24, paddingBottom: 48 }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <Text style={{ fontSize: 22, fontFamily: theme.fontDisplay, color: theme.text }}>
              {existing ? t.profile.editVehicle : t.profile.addVehicle}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Icon name="close" size={22} color={theme.muted} />
            </TouchableOpacity>
          </View>

          {/* ── VIN Decoder ── */}
          <View style={{
            backgroundColor: theme.surface, borderRadius: 16,
            padding: 16, marginBottom: 20, ...cardShadow,
          }}>
            <Text style={{ color: theme.muted, fontSize: 11, fontFamily: theme.fontDisplay, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
              VIN Decode (optional)
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TextInput
                value={vin}
                onChangeText={handleVinChange}
                placeholder="17-character VIN"
                placeholderTextColor={theme.inputPlaceholder}
                autoCapitalize="characters"
                maxLength={17}
                style={{
                  flex: 1,
                  backgroundColor: theme.surfaceAlt, borderWidth: 1,
                  borderColor: vinDecoded ? theme.success : theme.border,
                  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
                  color: theme.text, fontSize: 14, letterSpacing: 1.5,
                  fontFamily: theme.fontBody,
                }}
              />
              {vinDecoding && <ActivityIndicator size="small" color={theme.primary} />}
              {vinDecoded && <Icon name="check_circle" size={22} color={theme.success} />}
            </View>
            {vinDecoded && (
              <Text style={{ color: theme.success, fontSize: 12, marginTop: 8 }}>
                ✓ Auto-filled from VIN — you can still edit any field below.
              </Text>
            )}
            {!vinDecoded && (
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>
                Enter your 17-digit VIN to auto-fill make, model, year, trim and fuel type.
              </Text>
            )}
          </View>

          {/* ── Vehicle Details ── */}
          <View style={{
            backgroundColor: theme.surface, borderRadius: 16,
            padding: 16, marginBottom: 20, ...cardShadow,
          }}>
            <Text style={{ color: theme.muted, fontSize: 11, fontFamily: theme.fontDisplay, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 }}>
              Vehicle Details
            </Text>
            <VehicleInput label={t.profile.vehicleMake} value={make} onChange={setMake} placeholder="e.g. Toyota" theme={theme} />
            <VehicleInput label={t.profile.vehicleModel} value={model} onChange={setModel} placeholder="e.g. Camry" theme={theme} />
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <VehicleInput label="Trim" value={trim} onChange={setTrim} placeholder="e.g. XLE" theme={theme} last />
              </View>
              <View style={{ flex: 1 }}>
                <VehicleInput label={t.profile.vehicleYear} value={year} onChange={setYear} placeholder="e.g. 2019" keyboardType="numeric" theme={theme} last />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <VehicleInput label={t.profile.vehicleColor} value={color} onChange={setColor} placeholder="e.g. Silver" theme={theme} last />
              </View>
              <View style={{ flex: 1 }}>
                <VehicleInput label="Seats" value={seats} onChange={setSeats} placeholder="e.g. 4" keyboardType="numeric" theme={theme} last />
              </View>
            </View>
          </View>

          {/* ── Fuel / Energy Type ── */}
          <View style={{
            backgroundColor: theme.surface, borderRadius: 16,
            padding: 16, marginBottom: 20, ...cardShadow,
          }}>
            <Text style={{ color: theme.muted, fontSize: 11, fontFamily: theme.fontDisplay, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 }}>
              Energy Type
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {FUEL_TYPES.map(ft => {
                const active = fuelType === ft.label;
                return (
                  <TouchableOpacity
                    key={ft.label}
                    onPress={() => setFuelType(active ? '' : ft.label)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99,
                      backgroundColor: active ? theme.primary : theme.surfaceAlt,
                      borderWidth: 1, borderColor: active ? theme.primary : theme.border,
                    }}
                  >
                    <Icon name={ft.icon} size={16} color={active ? btnTextColor : theme.textSecondary} />
                    <Text style={{
                      color: active ? btnTextColor : theme.textSecondary,
                      fontSize: 13, fontFamily: theme.fontDisplay,
                    }}>
                      {ft.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Photo ── */}
          <TouchableOpacity onPress={pickPhoto} style={{ marginBottom: 20 }}>
            {photoUri ? (
              <View style={{ borderRadius: 16, overflow: 'hidden', ...cardShadow, backgroundColor: theme.surface }}>
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: '100%', height: 180, backgroundColor: theme.surfaceAlt }}
                  resizeMode="cover"
                  onError={() => setPhotoUri(null)}
                />
                <View style={{
                  position: 'absolute', bottom: 10, right: 10,
                  backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
                  paddingHorizontal: 12, paddingVertical: 6,
                }}>
                  <Text style={{ color: '#fff', fontSize: 12 }}>{t.profile.changePhoto}</Text>
                </View>
              </View>
            ) : (
              <View style={{
                width: '100%', height: 150, borderRadius: 16,
                backgroundColor: theme.surfaceAlt, borderWidth: 1.5,
                borderColor: theme.border,
                alignItems: 'center', justifyContent: 'center', gap: 8,
                ...cardShadow,
              }}>
                <Icon name="camera" size={32} color={theme.muted} />
                <Text style={{ color: theme.primary, fontSize: 14, fontFamily: theme.fontDisplay }}>
                  {t.profile.addPhoto}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>Full side view — 16:7 ratio</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ── Amenities ── */}
          <View style={{
            backgroundColor: theme.surface, borderRadius: 16,
            padding: 16, marginBottom: 20, ...cardShadow,
          }}>
            <Text style={{ color: theme.muted, fontSize: 11, fontFamily: theme.fontDisplay, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 }}>
              {t.profile.vehicleAmenities}
            </Text>
            {AMENITY_GROUPS.map(group => (
              <View key={group.label} style={{ marginBottom: 14 }}>
                <Text style={{ color: theme.muted, fontSize: 10, fontFamily: theme.fontDisplay, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                  {group.label}
                </Text>
                {/* Chip row */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {group.items.map(({ key, label }) => {
                    const selected = amenities.has(key);
                    const isExpanded = expandedAmenity === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => {
                          if (!selected) {
                            toggleAmenity(key);
                          } else {
                            setExpandedAmenity(isExpanded ? null : key);
                          }
                        }}
                        onLongPress={() => { if (selected) toggleAmenity(key); }}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 6,
                          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99,
                          backgroundColor: selected ? theme.primary + '18' : theme.surfaceAlt,
                          borderWidth: 1.5,
                          borderColor: selected ? theme.primary : theme.border,
                        }}
                      >
                        <Icon name={key as IconName} size={15} color={selected ? theme.primary : theme.muted} />
                        <Text style={{
                          color: selected ? theme.primary : theme.textSecondary,
                          fontSize: 12, fontFamily: theme.fontDisplay,
                        }}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {/* Expanded detail panels for selected amenities in this group */}
                {group.items
                  .filter(({ key }) => amenities.has(key) && expandedAmenity === key)
                  .map(({ key, label }) => {
                    const choices = AMENITY_CHOICES[key];
                    const detail = amenityDetails.get(key) ?? { choices: [], note: '' };
                    return (
                      <View key={`panel-${key}`} style={{
                        marginTop: 10, borderRadius: 12,
                        backgroundColor: theme.surfaceAlt,
                        borderWidth: 1, borderColor: theme.primary + '30',
                        padding: 14,
                      }}>
                        <Text style={{ color: theme.primary, fontSize: 11, fontFamily: theme.fontDisplay, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
                          {label}
                        </Text>
                        {choices && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                            {choices.map(c => {
                              const active = detail.choices.includes(c);
                              return (
                                <TouchableOpacity
                                  key={c}
                                  onPress={() => toggleAmenityChoice(key, c)}
                                  style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 6,
                                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                                    backgroundColor: active ? theme.primary + '20' : theme.surface,
                                    borderWidth: 1,
                                    borderColor: active ? theme.primary : theme.border,
                                  }}
                                >
                                  <View style={{
                                    width: 16, height: 16, borderRadius: 4, borderWidth: 1.5,
                                    borderColor: active ? theme.primary : theme.border,
                                    backgroundColor: active ? theme.primary : 'transparent',
                                    alignItems: 'center', justifyContent: 'center',
                                  }}>
                                    {active && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                                  </View>
                                  <Text style={{ color: active ? theme.primary : theme.textSecondary, fontSize: 12, fontFamily: theme.fontDisplay }}>
                                    {c}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                        <TextInput
                          value={detail.note}
                          onChangeText={t => setAmenityNote(key, t)}
                          multiline
                          numberOfLines={3}
                          placeholder="Add a note for passengers..."
                          placeholderTextColor={theme.inputPlaceholder}
                          style={{
                            backgroundColor: theme.surface, borderWidth: 1,
                            borderColor: theme.border, borderRadius: 10,
                            paddingHorizontal: 12, paddingVertical: 10,
                            color: theme.text, fontSize: 13,
                            fontFamily: theme.fontBody, minHeight: 72,
                            textAlignVertical: 'top',
                          }}
                        />
                      </View>
                    );
                  })}
              </View>
            ))}
          </View>

          {/* ── Insurance ── */}
          <TouchableOpacity
            onPress={() => setInsured(!insured)}
            style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 12,
              backgroundColor: theme.surface, borderWidth: 1,
              borderColor: insured ? theme.primary : theme.border,
              borderRadius: 16, padding: 16, marginBottom: 28,
              ...cardShadow,
            }}
            activeOpacity={0.7}
          >
            <View style={{
              width: 22, height: 22, borderRadius: 5, borderWidth: 2,
              borderColor: insured ? theme.primary : theme.border,
              backgroundColor: insured ? theme.primary : 'transparent',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
            }}>
              {insured && (
                <Text style={{ color: btnTextColor, fontSize: 13, fontFamily: theme.fontDisplay }}>✓</Text>
              )}
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19, flex: 1 }}>
              {t.profile.insuranceCertify}
            </Text>
          </TouchableOpacity>

          {/* ── Save ── */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={isBusy}
            style={{
              backgroundColor: theme.primary, borderRadius: 16,
              paddingVertical: 16, alignItems: 'center', marginBottom: 12,
              ...cardShadow, shadowColor: theme.primary, shadowOpacity: 0.4,
            }}
          >
            {isBusy ? (
              <ActivityIndicator color={btnTextColor} />
            ) : (
              <Text style={{ color: btnTextColor, fontFamily: theme.fontDisplay, fontSize: 16 }}>
                {t.profile.saveVehicle}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={{ alignItems: 'center', paddingVertical: 14 }}
          >
            <Text style={{ color: theme.muted, fontSize: 15 }}>{t.profile.cancel}</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </Modal>
  );
}

function VehicleInput({
  label, value, onChange, placeholder, keyboardType = 'default', theme, last = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; keyboardType?: 'default' | 'numeric'; theme: any; last?: boolean;
}) {
  return (
    <View style={{ marginBottom: last ? 0 : 14 }}>
      <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 5 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor={theme.inputPlaceholder}
        style={{
          backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border,
          borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
          color: theme.text, fontSize: 15,
        }}
      />
    </View>
  );
}
