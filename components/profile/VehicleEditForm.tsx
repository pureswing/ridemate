import { useState, useEffect } from 'react';
import { View, ScrollView, Pressable as RNPressable, ActivityIndicator, Image } from 'react-native';
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
import { BottomSheet } from '@/components/ui/BottomSheet';
import { InfoSheet } from '@/components/ui/InfoSheet';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { useVehicleProfile } from '@/hooks/useVehicleProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VehicleProfile, VehicleKind, VehicleAmenity, AmenityDetails } from '@/types';
import { IconName } from '@/constants/icons';
import { fonts, radii, shadows } from '@/constants/themes';
import { VEHICLE_TYPES } from '@/constants/rideFormOptions';

// Sub-choices shown in the amenity detail sheet (e.g. tapping "Bluetooth"
// offers "Car Speakers"/"Aux Cable") — left English-only like VEHICLE_CLASSES/
// FUEL_TYPE_VALUES above: the picked string IS the stored amenity_details
// value, not a translatable label over a separate enum key.
const AMENITY_CHOICES: Partial<Record<VehicleAmenity, string[]>> = {
  ev_station:    ['USB-C', 'Lightning', 'Wireless', 'USB-B', 'USB-A', 'AC Output'],
  bluetooth:     ['Bluetooth', 'Aux Cable'],
  wifi:          ['Hotspot', 'Mobile Data'],
  seat_heater:   ['Front', 'Rear', 'All Seats'],
  baby_seat:     ['Infant', 'Convertible', 'Booster'],
  pets_ok:       ['Dogs', 'Cats', 'Small Pets Only'],
  music_ok:      ['Electronic','Pop', 'Latin', 'Rock', 'Hip-Hop', 'Jazz', 'Classical'],
  ac_unit:       ['Front Only', 'Front & Rear', 'Individual Controls'],
  glass_cocktail:['Water', 'Soda', 'Juice', 'Alcoholic'],
  dashcam:       ['Exterior', 'Interior', 'Video Only', 'Video + Audio'],
  celebration:   ['Karaoke', 'DJ Lights'],
  hand_wash:     ['Disposable Wipes', 'Hand Sanitizer'],
  snacks:        ['Gum', 'Candy', 'Chocolate'],
};

// Labels come from useTranslation() — built inside the component (below) as
// AMENITY_GROUPS/RULE_ITEMS aren't module-level constants anymore, since they
// need `t`. Kept the same shape/keys so everything downstream (AMENITY_LABELS,
// toggle handlers, etc.) is unchanged.
function buildAmenityGroups(t: ReturnType<typeof useTranslation>): { label: string; items: { key: VehicleAmenity; label: string }[] }[] {
  return [
    {
      label: t.profile.vehicleGroupCharging,
      items: [
        { key: 'ev_station',    label: t.profile.amenityCharger },
        { key: 'bluetooth',     label: t.profile.amenityVehicleConnection },
        { key: 'wifi',          label: t.profile.amenityWifi },
        { key: 'dashcam',       label: t.profile.amenityDashcam },
      ],
    },
    {
      label: t.profile.vehicleGroupComfort,
      items: [
        { key: 'seat_recline',  label: t.profile.amenityComfortSeat },
        { key: 'seat_heater',   label: t.profile.amenitySeatHeater },
        { key: 'baby_seat',     label: t.profile.amenityBabySeat },
        { key: 'ac_unit',       label: t.profile.amenityAc },
        { key: 'accessible',    label: t.profile.amenityAccessible },
        { key: 'trunk_space',   label: t.profile.amenityTrunkSpace },
      ],
    },
    {
      label: t.profile.vehicleGroupVibe,
      items: [
        { key: 'music_ok',      label: t.profile.amenityMusic },
        { key: 'quiet_ride',    label: t.profile.amenityQuietRide },
        { key: 'celebration',   label: t.profile.amenityCelebration },
        { key: 'glass_cocktail',label: t.profile.amenityBar },
        { key: 'hand_wash',     label: t.profile.amenityCleanHands },
        { key: 'snacks',        label: t.profile.amenitySnacks },
      ],
    },
  ];
}

// Kept as its own picker/section (VehicleEditForm's own Field, not folded
// into the amenities chip groups above) — same VehicleAmenity[]/amenity_details
// storage as the rest, just grouped separately in the UI per the design.
function buildRuleItems(t: ReturnType<typeof useTranslation>): { key: VehicleAmenity; label: string }[] {
  return [
    { key: 'smoke_free',    label: t.profile.ruleNoSmoking },
    { key: 'smoking',       label: t.profile.ruleSmokingOk },
    { key: 'vape_free',     label: t.profile.ruleNoVaping },
    { key: 'cannabis_free', label: t.profile.ruleNoCannabis },
    { key: 'cannabis_ok',   label: t.profile.ruleCannabisOk },
    { key: 'food_off',      label: t.profile.ruleNoFastFood },
    { key: 'no_pets',       label: t.profile.ruleNoPets },
    { key: 'pets_ok',       label: t.profile.rulePetsOk },
  ];
}

// Same catalog the ride post form's Vehicle Type field uses
// (constants/rideFormOptions.ts) — minus "No preference", which only makes
// sense for a passenger's request, not for describing your own vehicle.
// Sorted shortest-to-longest label so the flexWrap chip row packs tightly
// instead of orphaning short chips onto their own line — same fix as
// OVERSIZED_ITEMS in the same constants file. Left English-only, same
// established precedent as VEHICLE_TYPES itself (constants/rideFormOptions.ts) —
// the stored value IS this literal string, unlike the amenity/rule labels
// above (those store an enum key, so translating the display label is safe).
const VEHICLE_CLASSES = VEHICLE_TYPES.filter((v) => v !== 'No preference').sort((a, b) => a.length - b.length);

// The stored fuel_type value is this literal English string (no separate
// enum key exists for it) — same constraint as VEHICLE_CLASSES above, so the
// value itself stays English while FUEL_TYPE_LABELS (below, built from `t`)
// supplies the translated display text for each one.
const FUEL_TYPE_VALUES: { value: string; icon: IconName }[] = [
  { value: 'Gas',            icon: 'fuel' },
  { value: 'Electric',       icon: 'ev_station' },
  { value: 'Hybrid',         icon: 'hybrid' },
  { value: 'Plug-in Hybrid', icon: 'ev_station' },
  { value: 'Diesel',         icon: 'oil_barrel' },
  { value: 'Flex-Fuel',      icon: 'loop' },
];

function buildFuelTypeLabels(t: ReturnType<typeof useTranslation>): Record<string, string> {
  return {
    Gas: t.profile.fuelGas,
    Electric: t.profile.fuelElectric,
    Hybrid: t.profile.fuelHybrid,
    'Plug-in Hybrid': t.profile.fuelPlugInHybrid,
    Diesel: t.profile.fuelDiesel,
    'Flex-Fuel': t.profile.fuelFlexFuel,
  };
}

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
  const AMENITY_GROUPS = buildAmenityGroups(t);
  const RULE_ITEMS = buildRuleItems(t);
  // Label lookup for the detail-sheet modal, shared by both the Features &
  // extras chips and the Rules chips.
  const AMENITY_LABELS: Partial<Record<VehicleAmenity, string>> = Object.fromEntries(
    [...AMENITY_GROUPS.flatMap((g) => g.items), ...RULE_ITEMS].map(({ key, label }) => [key, label])
  );
  const FUEL_TYPE_LABELS = buildFuelTypeLabels(t);
  const { upsertVehicle, deleteVehicle, uploadVehiclePhoto, loading } = useVehicleProfile();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [infoSheet, setInfoSheet] = useState<{ title: string; message: string } | null>(null);

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
        setInfoSheet({ title: t.profile.vinNotFoundTitle, message: t.profile.vinNotFoundMsg });
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
      setInfoSheet({ title: t.rideDetail.errorTitle, message: t.profile.vinDbErrorMsg });
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
      setInfoSheet({ title: t.common.photoPermissionTitle, message: t.profile.vehiclePhotoPermissionMsg });
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
      setInfoSheet({ title: t.profile.vehicleRequiredFieldsTitle, message: t.profile.vehicleRequiredFieldsMsg });
      return;
    }
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 1980 || yearNum > 2030) {
      setInfoSheet({ title: t.profile.vehicleInvalidYearTitle, message: t.profile.vehicleInvalidYearMsg });
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
      setInfoSheet({ title: t.rideDetail.errorTitle, message: e.message });
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
      setInfoSheet({ title: t.rideDetail.errorTitle, message: e.message });
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
      <Field label={t.profile.vinLabel} hint={t.post.optional}>
        <Input
          icon="search"
          value={vin}
          onChangeText={handleVinChange}
          placeholder={t.profile.vinPlaceholder}
          autoCapitalize="characters"
          maxLength={17}
          rightElement={vinDecoding ? <ActivityIndicator size="small" color={theme.primary} /> : vinDecoded ? <Icon name="check_circle" size={20} color={theme.driverText} /> : undefined}
        />
        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: vinDecoded ? theme.driverText : theme.textFaint, marginTop: 7 }}>
          {vinDecoded ? t.profile.vinHintDecoded : t.profile.vinHintPrompt}
        </Text>
        <Text style={{ fontFamily: fonts.bodyRegular, fontStyle: 'italic', fontSize: 10.5, color: theme.textFaint, marginTop: 4, lineHeight: 15 }}>
          {t.profile.vinDisclaimer}
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
        <Field label={t.profile.vehicleTrim}  style={{ flex: 1 }}>
          <Input icon="sparkles" value={trim} onChangeText={setTrim} placeholder="XSE" />
        </Field>
      </View>

      {/* Color + Plate */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label={t.profile.vehicleColor} style={{ flex: 1 }}>
          <Input icon="palette" value={color} onChangeText={setColor} placeholder="Pearl White" />
        </Field>
        <Field label={t.profile.vehiclePlate} hint={t.profile.vehiclePlateHint} style={{ flex: 1 }}>
          <Input icon="tag" value={plate} onChangeText={(v) => setPlate(v.toUpperCase())} placeholder="MIA-4471" autoCapitalize="characters" />
        </Field>
      </View>

      {/* Seats */}
      <Field label={t.profile.vehicleSeats}>
        <CardBox>
          <StepRow
            icon="passenger"
            label={t.profile.vehicleSeatsLabel}
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
              {vt === 'Wheelchair-Accessible Vehicle' ? t.profile.vehicleTypeWheelchairShort : vt}
            </RuleChip>
          ))}
        </View>
      </Field>

      {/* Fuel type */}
      <Field label={t.profile.vehicleFuelType}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FUEL_TYPE_VALUES.map((ft) => (
            <RuleChip key={ft.value} active={fuelType === ft.value} onPress={() => setFuelType(fuelType === ft.value ? '' : ft.value)} accent={theme.primary} theme={theme} icon={ft.icon}>
              {FUEL_TYPE_LABELS[ft.value]}
            </RuleChip>
          ))}
        </View>
      </Field>

      {/* Photo */}
      <Field label={t.profile.vehiclePhotoLabel} hint={t.post.optional}>
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
              <Text style={{ color: theme.muted, fontSize: 12, fontFamily: fonts.bodyRegular }}>{t.profile.vehiclePhotoHint}</Text>
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
        {/* Both flex:1 (not just Save) — a ghost Button sized to its own text
            let "Cancelar" (longer than "Cancel") eat into Save's share of the
            row, squeezing "Guardar" down via Button's adjustsFontSizeToFit
            in Spanish specifically. Splitting the row evenly keeps both
            buttons' text at full size regardless of language. */}
        <View style={{ flex: 1 }}>
          <Button variant="ghost" size="lg" fullWidth onPress={onCancel}>
            {t.profile.cancel}
          </Button>
        </View>
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
      <BottomSheet visible={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} dismissable={!deleting} style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
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
      </BottomSheet>

      {/* Amenity/rule detail sheet — choices + note for whichever chip was
          just selected. Plain RN Pressable, same pattern as the
          delete-confirm modal above. */}
      <BottomSheet visible={detailAmenity !== null} onClose={() => setDetailAmenity(null)} style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
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
                      placeholder={t.profile.amenityNotePlaceholder}
                    />
                    <Button variant="primary" size="lg" fullWidth style={{ marginTop: 18 }} onPress={() => setDetailAmenity(null)}>
                      {t.post.save}
                    </Button>
                  </>
                );
              })()}
      </BottomSheet>
      <InfoSheet
        visible={!!infoSheet}
        tone="danger"
        icon="warning"
        title={infoSheet?.title ?? ''}
        message={infoSheet?.message ?? ''}
        confirmLabel={t.common.gotIt}
        onClose={() => setInfoSheet(null)}
      />
    </View>
  );
}
