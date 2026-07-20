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

export const AMENITY_LABELS: Record<VehicleAmenity, string> = {
  ev_station:    'Charger',
  bluetooth:     'Bluetooth',
  wifi:          'WiFi',
  dashcam:       'Dashcam',
  seat_recline:  'Comfort Seat',
  seat_heater:   'Seat Heater',
  baby_seat:     'Baby Seat',
  ac_unit:       'A/C',
  accessible:    'Accessible',
  smoking:       'Smoking OK',
  smoke_free:    'No Smoking',
  vape_free:     'No Vaping',
  cannabis_ok:   'Cannabis OK',
  cannabis_free: 'No Cannabis',
  glass_cocktail:'Bar',
  food_off:      'No Fast Food',
  music_ok:      'Music',
  quiet_ride:    'Quiet Ride',
  celebration:   'Celebration',
  hand_wash:     'Clean Hands',
  pets_ok:       'Pets OK',
  no_pets:       'No Pets',
};

function fuelIcon(fuel?: string): IconName {
  if (fuel === 'Electric') return 'bolt';
  if (fuel === 'Hybrid' || fuel === 'Plug-in Hybrid') return 'eco';
  return 'fuel';
}

interface Props {
  visible: boolean;
  vehicle: VehicleProfile;
  onClose: () => void;
  onEdit: () => void;
}

// Ported from ui_kits/ridemate-app/VehicleProfile.jsx — the design's
// "isLuxury"/insurance-document fields have no equivalent in VehicleProfile
// (types/index.ts), so those are left out rather than faked; everything
// else (vehicle_type, plate, rules) is real vehicle_profiles data.
export function VehicleDetailModal({ visible, vehicle, onClose, onEdit }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || t.profile.addVehicle;
  const kindLabel = vehicle.kind === 'hauling' ? t.profile.haulingCategory : t.profile.ridesCourierCategory;
  const specs: { icon: IconName; label: string; value: string }[] = [
    { icon: 'car', label: t.profile.vehicleMake, value: vehicle.make || '—' },
    { icon: 'verified', label: t.profile.vehicleModel, value: vehicle.model || '—' },
    { icon: 'sparkles', label: 'Trim', value: vehicle.trim || '—' },
    { icon: 'event', label: t.profile.vehicleYear, value: String(vehicle.year) },
    { icon: 'palette', label: t.profile.vehicleColor, value: vehicle.color || '—' },
    { icon: fuelIcon(vehicle.fuel_type), label: 'Fuel', value: vehicle.fuel_type || '—' },
    { icon: 'passenger', label: 'Seats', value: vehicle.seats != null ? String(vehicle.seats) : '—' },
    ...(vehicle.plate ? [{ icon: 'tag' as IconName, label: t.profile.vehiclePlate, value: vehicle.plate }] : []),
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
          style={{ paddingTop: insets.top + 8, paddingBottom: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
            <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={onClose} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
              {kindLabel}
            </Text>
            <IconButton icon="sliders" variant="glass" label={t.profile.editVehicle} onPress={onEdit} />
          </View>
          <View style={{ paddingHorizontal: 22, paddingTop: 10 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 24, letterSpacing: letterSpacingFor(24, tracking.tight), color: theme.cream }}>
              {t.profile.vehicleSection}
            </Text>
          </View>
        </LinearGradient>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}>
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

        <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, backgroundColor: theme.surface, padding: 16, paddingBottom: insets.bottom + 16, ...shadows.lg }}>
          <Button variant="primary" size="lg" icon="sliders" fullWidth onPress={onEdit}>
            {t.profile.editVehicle}
          </Button>
        </View>
      </View>
    </Modal>
  );
}
