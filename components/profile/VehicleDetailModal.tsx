import { View, Modal, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VehicleProfile, VehicleAmenity } from '@/types';
import { IconName } from '@/constants/icons';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';

// Same VehicleAmenity keys as VehicleEditForm.tsx's own AMENITY_GROUPS/
// RULE_ITEMS builders, reusing the exact same t.profile.* translation keys —
// kept as its own function here (rather than importing theirs) since this
// component is also used standalone (app/messages/[id].tsx's VehiclePeekCard).
export function buildAmenityLabels(t: ReturnType<typeof useTranslation>): Record<VehicleAmenity, string> {
  return {
    ev_station:    t.profile.amenityCharger,
    bluetooth:     t.profile.amenityVehicleConnection,
    wifi:          t.profile.amenityWifi,
    dashcam:       t.profile.amenityDashcam,
    seat_recline:  t.profile.amenityComfortSeat,
    seat_heater:   t.profile.amenitySeatHeater,
    baby_seat:     t.profile.amenityBabySeat,
    ac_unit:       t.profile.amenityAc,
    accessible:    t.profile.amenityAccessible,
    trunk_space:   t.profile.amenityTrunkSpace,
    smoking:       t.profile.ruleSmokingOk,
    smoke_free:    t.profile.ruleNoSmoking,
    vape_free:     t.profile.ruleNoVaping,
    cannabis_ok:   t.profile.ruleCannabisOk,
    cannabis_free: t.profile.ruleNoCannabis,
    glass_cocktail:t.profile.amenityBar,
    food_off:      t.profile.ruleNoFastFood,
    music_ok:      t.profile.amenityMusic,
    quiet_ride:    t.profile.amenityQuietRide,
    celebration:   t.profile.amenityCelebration,
    hand_wash:     t.profile.amenityCleanHands,
    pets_ok:       t.profile.rulePetsOk,
    no_pets:       t.profile.ruleNoPets,
    snacks:        t.profile.amenitySnacks,
  };
}

// The stored fuel_type value is a literal English string (see
// VehicleEditForm.tsx's FUEL_TYPE_VALUES comment) — this maps it to a
// translated display string without touching the stored value.
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

function fuelIcon(fuel?: string): IconName {
  if (fuel === 'Electric') return 'bolt';
  if (fuel === 'Hybrid' || fuel === 'Plug-in Hybrid') return 'eco';
  return 'fuel';
}

interface Props {
  visible: boolean;
  vehicle: VehicleProfile;
  onClose: () => void;
  // Omit when viewing someone else's vehicle (e.g. from their public
  // profile) — hides both edit affordances instead of wiring them to a
  // no-op, since editing a stranger's vehicle isn't a real action.
  onEdit?: () => void;
  // Plate is PII — never shown on a public profile visit (no onEdit, no
  // relationship context). The one caller that shows another user's
  // vehicle with a real reason to (the post creator, inside their own
  // active chat thread with the driver) passes this explicitly true; see
  // app/messages/[id].tsx's VehiclePeekCard, which follows the same rule.
  showPlate?: boolean;
}

// Ported from ui_kits/ridemate-app/VehicleProfile.jsx — the design's
// "isLuxury"/insurance-document fields have no equivalent in VehicleProfile
// (types/index.ts), so those are left out rather than faked; everything
// else (vehicle_type, plate, rules) is real vehicle_profiles data.
export function VehicleDetailModal({ visible, vehicle, onClose, onEdit, showPlate }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  // Own vehicle (onEdit present) always shows it; anyone else only sees it
  // when the caller explicitly vouches for the relationship (showPlate).
  const canSeePlate = !!onEdit || !!showPlate;
  const AMENITY_LABELS = buildAmenityLabels(t);
  const FUEL_TYPE_LABELS = buildFuelTypeLabels(t);
  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || t.profile.addVehicle;
  const kindLabel = vehicle.kind === 'hauling' ? t.profile.haulingCategory : t.profile.ridesCourierCategory;
  const specs: { icon: IconName; label: string; value: string }[] = [
    { icon: 'car', label: t.profile.vehicleMake, value: vehicle.make || '—' },
    { icon: 'verified', label: t.profile.vehicleModel, value: vehicle.model || '—' },
    { icon: 'sparkles', label: t.profile.vehicleTrim, value: vehicle.trim || '—' },
    { icon: 'event', label: t.profile.vehicleYear, value: String(vehicle.year) },
    { icon: 'palette', label: t.profile.vehicleColor, value: vehicle.color || '—' },
    { icon: fuelIcon(vehicle.fuel_type), label: t.profile.vehicleFuelType, value: (vehicle.fuel_type && FUEL_TYPE_LABELS[vehicle.fuel_type]) || vehicle.fuel_type || '—' },
    { icon: 'passenger', label: t.profile.vehicleSeats, value: vehicle.seats != null ? String(vehicle.seats) : '—' },
    ...(vehicle.plate && canSeePlate ? [{ icon: 'tag' as IconName, label: t.profile.vehiclePlate, value: vehicle.plate }] : []),
  ];
  const RULE_KEYS: VehicleAmenity[] = ['smoke_free', 'smoking', 'vape_free', 'cannabis_free', 'cannabis_ok', 'food_off', 'no_pets', 'pets_ok'];
  const activeFeatures = vehicle.amenities.filter((a) => a in AMENITY_LABELS && !RULE_KEYS.includes(a));
  const activeRules = vehicle.amenities.filter((a) => RULE_KEYS.includes(a));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar style="light" />

        <LinearGradient
          colors={theme.gradientGold as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 8, paddingBottom: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg, zIndex: 10 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
            <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={onClose} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
              {kindLabel}
            </Text>
            {onEdit ? (
              <IconButton icon="sliders" variant="glass" label={t.profile.editVehicle} onPress={onEdit} />
            ) : (
              <View style={{ width: 44 }} />
            )}
          </View>
          <View style={{ paddingHorizontal: 22, paddingTop: 10 }}>
            {/* "My Vehicle" only makes sense when onEdit is present (i.e.
                this is actually your own vehicle, opened from Profile) —
                otherwise (someone else's, opened from their public profile)
                that phrasing is misleading, so it falls back to the plain,
                ownership-neutral "Vehicle" label used there instead. */}
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 24, letterSpacing: letterSpacingFor(24, tracking.tight), color: theme.cream }}>
              {onEdit ? t.profile.vehicleSection : t.userProfile.vehicleSection}
            </Text>
          </View>
        </LinearGradient>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: onEdit ? 40 : insets.bottom + 40 }}>
          {/* Photo */}
          <View style={{ width: '100%', height: 188, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.cardBorder, backgroundColor: theme.surfaceAlt, ...shadows.md }}>
            {vehicle.photo_url ? (
              <Image source={{ uri: vehicle.photo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="car" size={48} color={theme.textFaint} />
              </View>
            )}
          </View>

          {/* Title + badges */}
          <View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 24, letterSpacing: letterSpacingFor(24, tracking.tight), color: theme.text }}>
              {title}
            </Text>
            {(vehicle.vehicle_type || vehicle.insurance_self_certified) && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {vehicle.vehicle_type && <Badge tone="driver" icon="car" iconSize={13}>{vehicle.vehicle_type}</Badge>}
                {vehicle.insurance_self_certified && (
                  <Badge tone="success" icon="shield_check" iconSize={13}>{t.messages.vehicleInsured}</Badge>
                )}
              </View>
            )}
          </View>

          {/* Spec grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {specs.map((s) => (
              <View key={s.label} style={{
                width: '47%', flexDirection: 'row', alignItems: 'center', gap: 11,
                backgroundColor: theme.surface, borderRadius: radii.md, borderWidth: 1, borderColor: theme.cardBorder,
                padding: 12, ...shadows.xs,
              }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={s.icon} size={17} color={theme.textSecondary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: fonts.bodyExtraBold, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: letterSpacingFor(9.5, tracking.wide), color: theme.textFaint }}>
                    {s.label}
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: theme.text, marginTop: 1 }}>
                    {s.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Features & extras */}
          <View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, letterSpacing: letterSpacingFor(16, tracking.tight), color: theme.text, marginBottom: 10 }}>
              {t.profile.vehicleAmenities}
            </Text>
            {activeFeatures.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {activeFeatures.map((a) => (
                  <View key={a} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
                    borderRadius: radii.pill, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.cardBorder, ...shadows.xs,
                  }}>
                    <Icon name={a as IconName} size={15} color={theme.primary} />
                    <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12.5, color: theme.text }}>{AMENITY_LABELS[a]}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: theme.muted, lineHeight: 19 }}>
                {t.profile.vehicleAmenitiesEmpty}
              </Text>
            )}
          </View>

          {/* Rules — its own section, not folded into Features & extras */}
          <View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, letterSpacing: letterSpacingFor(16, tracking.tight), color: theme.text, marginBottom: 10 }}>
              {t.profile.vehicleRules}
            </Text>
            {activeRules.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {activeRules.map((a) => (
                  <View key={a} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
                    borderRadius: radii.pill, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.cardBorder, ...shadows.xs,
                  }}>
                    <Icon name={a as IconName} size={15} color={theme.primary} />
                    <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12.5, color: theme.text }}>{AMENITY_LABELS[a]}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: theme.muted, lineHeight: 19 }}>
                {t.profile.vehicleAmenitiesEmpty}
              </Text>
            )}
          </View>

          {/* Insurance */}
          <View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, letterSpacing: letterSpacingFor(16, tracking.tight), color: theme.text, marginBottom: 10 }}>
              {t.profile.insuranceSection}
            </Text>
            {vehicle.insurance_self_certified ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: theme.surface, borderRadius: radii.md, borderWidth: 1, borderColor: theme.driverBorder,
                padding: 14, ...shadows.xs,
              }}>
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: theme.driverSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="shield_check" size={20} color={theme.driverText} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: theme.text }}>{t.profile.insuredVehicle}</Text>
                  <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.muted, marginTop: 1 }}>{t.profile.insuredVehicleSub}</Text>
                </View>
              </View>
            ) : (
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: theme.muted, lineHeight: 19 }}>
                {t.profile.insuranceEmpty}
              </Text>
            )}
          </View>
        </ScrollView>

        {onEdit && (
          <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, backgroundColor: theme.surface, padding: 16, paddingBottom: insets.bottom + 16, ...shadows.lg }}>
            <Button variant="primary" size="lg" icon="sliders" fullWidth onPress={onEdit}>
              {t.profile.editVehicle}
            </Button>
          </View>
        )}
      </View>
    </Modal>
  );
}
