import { useState, useEffect } from 'react';
import { View, ScrollView, Modal, Pressable as RNPressable, Alert, ActivityIndicator, Image } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { CardBox } from '@/components/ui/CardBox';
import { StepRow } from '@/components/ui/StepRow';
import { RuleChip } from '@/components/ui/RuleChip';
import { PlainToggleRow } from '@/components/ui/PlainToggleRow';
import { Button } from '@/components/ui/Button';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { useVehicleProfile } from '@/hooks/useVehicleProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VehicleProfile, VehicleKind, VehicleAmenity, AmenityDetails } from '@/types';
import { IconName } from '@/constants/icons';
import { fonts, radii, shadows } from '@/constants/themes';
import { VEHICLE_TYPES } from '@/constants/rideFormOptions';

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
];

// Kept as its own picker/section (VehicleEditForm's own Field, not folded
// into the amenities chip groups above) — same VehicleAmenity[]/amenity_details
// storage as the rest, just grouped separately in the UI per the design.
const RULE_ITEMS: { key: VehicleAmenity; label: string }[] = [
  { key: 'smoke_free',    label: 'No Smoking' },
  { key: 'smoking',       label: 'Smoking OK' },
  { key: 'vape_free',     label: 'No Vaping' },
  { key: 'cannabis_free', label: 'No Cannabis' },
  { key: 'cannabis_ok',   label: 'Cannabis OK' },
  { key: 'food_off',      label: 'No Fast Food' },
  { key: 'no_pets',       label: 'No Pets' },
  { key: 'pets_ok',       label: 'Pets OK' },
];

// Label lookup for the detail-sheet modal, shared by both the Features &
// extras chips and the Rules chips.
const AMENITY_LABELS: Partial<Record<VehicleAmenity, string>> = Object.fromEntries(
  [...AMENITY_GROUPS.flatMap((g) => g.items), ...RULE_ITEMS].map(({ key, label }) => [key, label])
);

// Same catalog the ride post form's Vehicle Type field uses
// (constants/rideFormOptions.ts) — minus "No preference", which only makes
// sense for a passenger's request, not for describing your own vehicle.
// Sorted shortest-to-longest label so the flexWrap chip row packs tightly
// instead of orphaning short chips onto their own line — same fix as
// OVERSIZED_ITEMS in the same constants file.
const VEHICLE_CLASSES = VEHICLE_TYPES.filter((v) => v !== 'No preference').sort((a, b) => a.length - b.length);

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
  userId: string;
  kind: VehicleKind;
  existing: VehicleProfile | null;
  onSaved: (v: VehicleProfile) => void;
  onCancel: () => void;
  // Called after the vehicle is actually deleted — only offered when
  // `existing` is set (nothing to delete on a fresh "add vehicle" form).
  onDelete?: () => void;
  // The user's other-kind vehicle (rides_courier ↔ hauling), if they have
  // one — offers a one-tap "import specs" banner, per VehicleEdit.jsx.
  otherVehicle?: VehicleProfile | null;
  otherVehicleLabel?: string;
  // Hides the internal title+close row — used when the caller (a routed
  // screen with its own gradient header) already shows a title/back button.
  hideHeader?: boolean;
  style?: object;
}

// Self-contained scroll + sticky Save/Cancel/Delete footer — the sole entry
// point for creating/editing a vehicle (app/profile/vehicle-edit.tsx).
// Ported from ui_kits/ridemate-app/VehicleEdit.jsx — only "isLuxury" and the
// insurance-document upload have no equivalent in VehicleProfile
// (types/index.ts), so those are left out rather than faked; everything
// else (vehicle_type, license plate, ride rules as their own section) is
// real vehicle_profiles data. "Import specs from other vehicle" DOES have
// real backing (make/model/trim/year/color/plate/vehicle_type/seats/
// fuel_type all exist on both kinds) so
// that one is implemented — just without the plate field, which doesn't exist.
export function VehicleEditForm({ userId, kind, existing, onSaved, onCancel, onDelete, otherVehicle, otherVehicleLabel, hideHeader = false, style }: Props) {
  const t = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { upsertVehicle, deleteVehicle, uploadVehiclePhoto, loading } = useVehicleProfile();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [vin, setVin] = useState(existing?.vin ?? '');
  const [vinDecoding, setVinDecoding] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);

  const [make, setMake] = useState(existing?.make ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [trim, setTrim] = useState(existing?.trim ?? '');
  const [year, setYear] = useState(existing?.year?.toString() ?? '');
  const [color, setColor] = useState(existing?.color ?? '');
  const [plate, setPlate] = useState(existing?.plate ?? '');
  const [vehicleType, setVehicleType] = useState(existing?.vehicle_type ?? '');
  const [fuelType, setFuelType] = useState(existing?.fuel_type ?? '');
  const [seats, setSeats] = useState(existing?.seats ?? 4);
  const [photoUri, setPhotoUri] = useState<string | null>(existing?.photo_url ?? null);
  const [amenities, setAmenities] = useState<Set<VehicleAmenity>>(new Set(existing?.amenities ?? []));
  const [amenityDetails, setAmenityDetails] = useState<Map<VehicleAmenity, { choices: string[]; note: string }>>(
    () => new Map(Object.entries(existing?.amenity_details ?? {}) as [VehicleAmenity, { choices: string[]; note: string }][])
  );
  const [insured, setInsured] = useState(existing?.insurance_self_certified ?? false);
  const [uploading, setUploading] = useState(false);
  // Which amenity's choices/note sheet is currently open — opened
  // automatically when a chip is newly selected, matching OversizedSheet's
  // select-then-configure modal flow instead of an inline expanding panel.
  const [detailAmenity, setDetailAmenity] = useState<VehicleAmenity | null>(null);

  // Re-sync when `existing` itself changes identity (e.g. the routed screen
  // finishes fetching it after mount) — the modal version passed a stable
  // `existing` from the start, so this only really fires for the screen.
  useEffect(() => {
    setVin(existing?.vin ?? '');
    setVinDecoded(false);
    setMake(existing?.make ?? '');
    setModel(existing?.model ?? '');
    setTrim(existing?.trim ?? '');
    setYear(existing?.year?.toString() ?? '');
    setColor(existing?.color ?? '');
    setPlate(existing?.plate ?? '');
    setVehicleType(existing?.vehicle_type ?? '');
    setFuelType(existing?.fuel_type ?? '');
    setSeats(existing?.seats ?? 4);
    setPhotoUri(existing?.photo_url ?? null);
    setAmenities(new Set(existing?.amenities ?? []));
    setAmenityDetails(new Map(Object.entries(existing?.amenity_details ?? {}) as [VehicleAmenity, { choices: string[]; note: string }][]));
    setInsured(existing?.insurance_self_certified ?? false);
  }, [existing]);

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
      if (!isNaN(totalSeats) && totalSeats > 1) setSeats(totalSeats - 1);

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

  function importSpecs() {
    if (!otherVehicle) return;
    setMake(otherVehicle.make);
    setModel(otherVehicle.model);
    setTrim(otherVehicle.trim ?? '');
    setYear(String(otherVehicle.year));
    setColor(otherVehicle.color);
    setPlate(otherVehicle.plate ?? '');
    setVehicleType(otherVehicle.vehicle_type ?? '');
    setSeats(otherVehicle.seats ?? 4);
    setFuelType(otherVehicle.fuel_type ?? '');
    setImportDone(true);
  }

  function toggleAmenity(a: VehicleAmenity) {
    setAmenities(prev => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
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
        finalPhotoUrl = await uploadVehiclePhoto(userId, kind, photoUri);
        setUploading(false);
      }
      const detailsObj: AmenityDetails = {};
      amenityDetails.forEach((v, k) => {
        if (amenities.has(k) && (v.choices.length > 0 || v.note.trim())) {
          detailsObj[k] = v;
        }
      });
      const saved = await upsertVehicle(userId, kind, {
        vin: vin.trim() || undefined,
        make: make.trim(),
        model: model.trim(),
        trim: trim.trim() || undefined,
        year: yearNum,
        color: color.trim(),
        plate: plate.trim() || undefined,
        vehicle_type: vehicleType || undefined,
        fuel_type: fuelType || undefined,
        seats,
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

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await deleteVehicle(userId, kind);
      setShowDeleteConfirm(false);
      onDelete?.();
    } catch (e: any) {
      setDeleting(false);
      Alert.alert('Error', e.message);
    }
  }

  const isBusy = loading || uploading;

  return (
    <View style={[{ flex: 1 }, style]}>
    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 18 }}>
      {!hideHeader && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: theme.text }}>
            {existing ? t.profile.editVehicle : t.profile.addVehicle}
          </Text>
          <TouchableOpacity onPress={onCancel} style={{ padding: 4 }}>
            <Icon name="close" size={22} color={theme.muted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Import specs from the user's other-kind vehicle, if any */}
      {otherVehicle && !importDone && (
        <TouchableOpacity
          onPress={importSpecs}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
            borderRadius: radii.md, borderWidth: 1.5, borderColor: theme.borderGold, backgroundColor: theme.gold400 + '12',
          }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.gold400 + '24', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="layers" size={18} color={theme.gold500} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: theme.text }}>
              {t.profile.importSpecs} {otherVehicleLabel}
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.muted, marginTop: 2 }}>
              {[otherVehicle.year, otherVehicle.make, otherVehicle.model].filter(Boolean).join(' ')} · {t.profile.importSpecsTap}
            </Text>
          </View>
          <Icon name="chevron_right" size={18} color={theme.gold500} />
        </TouchableOpacity>
      )}
      {importDone && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
          borderRadius: radii.md, backgroundColor: theme.driverSoft, borderWidth: 1, borderColor: theme.driverBorder,
        }}>
          <Icon name="check" size={16} color={theme.driverText} strokeWidth={2.5} />
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: theme.driverText }}>
            {t.profile.importSpecsDone}
          </Text>
        </View>
      )}

      {/* VIN decode */}
      <Field label="VIN" hint={t.post.optional}>
        <Input
          icon="search"
          value={vin}
          onChangeText={handleVinChange}
          placeholder="17-character VIN"
          autoCapitalize="characters"
          maxLength={17}
          rightElement={vinDecoding ? <ActivityIndicator size="small" color={theme.primary} /> : vinDecoded ? <Icon name="check_circle" size={20} color={theme.driverText} /> : undefined}
        />
        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: vinDecoded ? theme.driverText : theme.textFaint, marginTop: 7 }}>
          {vinDecoded ? '✓ Auto-filled from VIN — you can still edit any field below.' : 'Enter your 17-digit VIN to auto-fill make, model, year, trim and fuel type.'}
        </Text>
      </Field>

      {/* Make + Model */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label={t.profile.vehicleMake} style={{ flex: 1 }}>
          <Input icon="car" value={make} onChangeText={setMake} placeholder="Toyota" />
        </Field>
        <Field label={t.profile.vehicleModel} style={{ flex: 1 }}>
          <Input value={model} onChangeText={setModel} placeholder="Camry" />
        </Field>
      </View>

      {/* Year + Trim */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label={t.profile.vehicleYear} style={{ flex: 1 }}>
          <Input icon="event" value={year} onChangeText={setYear} placeholder="2022" keyboardType="numeric" maxLength={4} />
        </Field>
        <Field label="Trim" hint={t.post.optional} style={{ flex: 1 }}>
          <Input icon="sparkles" value={trim} onChangeText={setTrim} placeholder="XSE" />
        </Field>
      </View>

      {/* Color */}
      <Field label={t.profile.vehicleColor}>
        <Input icon="palette" value={color} onChangeText={setColor} placeholder="Pearl White" />
      </Field>

      <Field label={t.profile.vehiclePlate} hint={t.profile.vehiclePlateHint}>
        <Input icon="tag" value={plate} onChangeText={(v) => setPlate(v.toUpperCase())} placeholder="MIA-4471" autoCapitalize="characters" />
      </Field>

      {/* Seats */}
      <Field label="Passenger seats">
        <CardBox>
          <StepRow
            icon="passenger"
            label="Seats for riders"
            value={seats}
            min={1}
            max={7}
            onDec={() => setSeats((s) => Math.max(1, s - 1))}
            onInc={() => setSeats((s) => Math.min(7, s + 1))}
            theme={theme}
          />
        </CardBox>
      </Field>

      {/* Vehicle type */}
      <Field label={t.profile.vehicleType}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {VEHICLE_CLASSES.map((vt) => (
            <RuleChip key={vt} active={vehicleType === vt} onPress={() => setVehicleType(vehicleType === vt ? '' : vt)} accent={theme.primary} theme={theme}>
              {vt === 'Wheelchair-Accessible Vehicle' ? 'Wheelchair-Accessible' : vt}
            </RuleChip>
          ))}
        </View>
      </Field>

      {/* Fuel type */}
      <Field label="Fuel type">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FUEL_TYPES.map((ft) => (
            <RuleChip key={ft.label} active={fuelType === ft.label} onPress={() => setFuelType(fuelType === ft.label ? '' : ft.label)} accent={theme.primary} theme={theme} icon={ft.icon}>
              {ft.label}
            </RuleChip>
          ))}
        </View>
      </Field>

      {/* Photo */}
      <Field label="Side photo" hint={t.post.optional}>
        <TouchableOpacity onPress={pickPhoto}>
          {photoUri ? (
            <View style={{ borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.cardBorder, backgroundColor: theme.surface, ...shadows.sm }}>
              <Image
                source={{ uri: photoUri }}
                style={{ width: '100%', height: 180, backgroundColor: theme.surfaceAlt }}
                resizeMode="cover"
                onError={() => setPhotoUri(null)}
              />
              <View style={{
                position: 'absolute', bottom: 10, right: 10,
                backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radii.xs,
                paddingHorizontal: 12, paddingVertical: 6,
              }}>
                <Text style={{ color: '#fff', fontSize: 12, fontFamily: fonts.bodySemibold }}>{t.profile.changePhoto}</Text>
              </View>
            </View>
          ) : (
            <View style={{
              width: '100%', height: 150, borderRadius: radii.lg,
              backgroundColor: theme.surfaceAlt, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.borderGold,
              alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Icon name="camera" size={30} color={theme.gold400} />
              <Text style={{ color: theme.primary, fontSize: 14, fontFamily: fonts.bodyBold }}>
                {t.profile.addPhoto}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 12, fontFamily: fonts.bodyRegular }}>Full side view — 16:7 ratio</Text>
            </View>
          )}
        </TouchableOpacity>
      </Field>

      {/* Amenities */}
      <View>
        <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, color: theme.text, marginBottom: 10 }}>
          {t.profile.vehicleAmenities}
        </Text>
        <View style={{ gap: 16 }}>
          {AMENITY_GROUPS.map((group) => (
            <View key={group.label}>
              <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, color: theme.textFaint, marginBottom: 8 }}>
                {group.label}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {group.items.map(({ key, label }) => (
                  <RuleChip
                    key={key}
                    active={amenities.has(key)}
                    accent={theme.primary}
                    theme={theme}
                    icon={key as IconName}
                    onPress={() => {
                      const wasSelected = amenities.has(key);
                      toggleAmenity(key);
                      if (!wasSelected) setDetailAmenity(key);
                    }}
                  >
                    {label}
                  </RuleChip>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Rules — its own section, not folded into Features & extras */}
      <View>
        <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, color: theme.text, marginBottom: 10 }}>
          {t.profile.vehicleRules}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {RULE_ITEMS.map(({ key, label }) => (
            <RuleChip
              key={key}
              active={amenities.has(key)}
              accent={theme.primary}
              theme={theme}
              icon={key as IconName}
              onPress={() => {
                const wasSelected = amenities.has(key);
                toggleAmenity(key);
                if (!wasSelected) setDetailAmenity(key);
              }}
            >
              {label}
            </RuleChip>
          ))}
        </View>
      </View>

      {/* Insurance */}
      <Field label={t.profile.insuranceSection}>
        <CardBox>
          <PlainToggleRow
            icon="shield_check"
            label={t.profile.insuredVehicle}
            sub={t.profile.insuredVehicleSub}
            checked={insured}
            onChange={setInsured}
            accent={theme.driverText}
            theme={theme}
          />
        </CardBox>
      </Field>

    </ScrollView>

      {/* Sticky action bar */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderTopWidth: 1, borderTopColor: theme.cardBorder, backgroundColor: theme.surface,
        padding: 16, paddingBottom: insets.bottom + 16, ...shadows.lg,
      }}>
        {existing && onDelete && (
          <TouchableOpacity
            onPress={() => setShowDeleteConfirm(true)}
            style={{ width: 46, height: 46, borderRadius: radii.md, borderWidth: 1.5, borderColor: theme.danger, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="delete" size={20} color={theme.danger} />
          </TouchableOpacity>
        )}
        <Button variant="ghost" size="lg" onPress={onCancel}>
          {t.profile.cancel}
        </Button>
        <View style={{ flex: 1 }}>
          <Button variant="primary" size="lg" fullWidth disabled={isBusy} onPress={handleSave}>
            {isBusy ? t.profile.saving : t.profile.saveVehicle}
          </Button>
        </View>
      </View>

      {/* Delete confirmation — plain RN Pressable, not the shared
          gesture-handler TouchableOpacity: nesting a GestureHandlerRootView
          inside a plain RN Modal left the whole screen's touches dead after
          the modal closed once (see app/messages/[id].tsx's ConfirmSheet
          comment for the full story). Plain Pressable sidesteps it. */}
      <Modal visible={showDeleteConfirm} transparent animationType="slide" onRequestClose={() => setShowDeleteConfirm(false)}>
        <RNPressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={() => setShowDeleteConfirm(false)}>
          <RNPressable onPress={() => {}}>
            <View style={{
              position: 'relative',
              backgroundColor: theme.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
              padding: 24, paddingBottom: insets.bottom + 24,
            }}>
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: -40, height: 40, backgroundColor: theme.surface }} />
              <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 20 }} />
              <View style={{
                width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: theme.danger,
                backgroundColor: theme.danger + '14', alignItems: 'center', justifyContent: 'center',
                alignSelf: 'center', marginBottom: 16,
              }}>
                <Icon name="delete" size={24} color={theme.danger} />
              </View>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 21, color: theme.text, textAlign: 'center' }}>
                {t.profile.deleteVehicleTitle}
              </Text>
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
                {t.profile.deleteVehicleMsg}
              </Text>
              <View style={{ gap: 10, marginTop: 22 }}>
                <RNPressable
                  onPress={handleConfirmDelete}
                  disabled={deleting}
                  style={{ height: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.danger, opacity: deleting ? 0.6 : 1 }}
                >
                  {deleting ? <ActivityIndicator color="#fff" /> : (
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: '#fff' }}>{t.profile.deleteVehicleConfirm}</Text>
                  )}
                </RNPressable>
                <RNPressable
                  onPress={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  style={{ height: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surfaceAlt }}
                >
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: theme.text }}>{t.profile.deleteVehicleCancel}</Text>
                </RNPressable>
              </View>
            </View>
          </RNPressable>
        </RNPressable>
      </Modal>

      {/* Amenity/rule detail sheet — choices + note for whichever chip was
          just selected. Plain RN Pressable + filler view, same pattern as
          the delete-confirm modal above. */}
      <Modal visible={detailAmenity !== null} transparent animationType="slide" onRequestClose={() => setDetailAmenity(null)}>
        <RNPressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={() => setDetailAmenity(null)}>
          <RNPressable onPress={() => {}}>
            <View style={{
              position: 'relative',
              backgroundColor: theme.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
              padding: 20, paddingBottom: insets.bottom + 20,
            }}>
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: -40, height: 40, backgroundColor: theme.surface }} />
              <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 18 }} />
              {detailAmenity && (() => {
                const key = detailAmenity;
                const label = AMENITY_LABELS[key] ?? '';
                const choices = AMENITY_CHOICES[key];
                const detail = amenityDetails.get(key) ?? { choices: [], note: '' };
                return (
                  <>
                    <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: theme.gold500, marginBottom: 14 }}>
                      {label}
                    </Text>
                    {choices && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                        {choices.map((c) => {
                          const active = detail.choices.includes(c);
                          // Plain RN Pressable, not RuleChip — RuleChip is built on the
                          // shared gesture-handler TouchableOpacity, which goes dead (or
                          // freezes the whole app if wrapped in GestureHandlerRootView)
                          // inside a plain Modal. See the delete-confirm sheet above.
                          return (
                            <RNPressable
                              key={c}
                              onPress={() => toggleAmenityChoice(key, c)}
                              style={{
                                flexDirection: 'row', alignItems: 'center',
                                height: 38, paddingHorizontal: 14, borderRadius: radii.pill, justifyContent: 'center',
                                backgroundColor: active ? theme.primary : theme.surface,
                                borderWidth: 1.5, borderColor: active ? theme.primary : theme.border,
                              }}
                            >
                              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: active ? '#fff' : theme.textSecondary }}>
                                {c}
                              </Text>
                            </RNPressable>
                          );
                        })}
                      </View>
                    )}
                    <Input
                      value={detail.note}
                      onChangeText={(v) => setAmenityNote(key, v)}
                      multiline
                      numberOfLines={3}
                      placeholder="Add a note for passengers…"
                    />
                    <Button variant="primary" size="lg" fullWidth style={{ marginTop: 18 }} onPress={() => setDetailAmenity(null)}>
                      {t.post.save}
                    </Button>
                  </>
                );
              })()}
            </View>
          </RNPressable>
        </RNPressable>
      </Modal>
    </View>
  );
}
