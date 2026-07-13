import { useState } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { VehicleProfile, VehicleAmenity } from '@/types';
import { IconName } from '@/constants/icons';

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

interface Props {
  visible: boolean;
  vehicle: VehicleProfile;
  onClose: () => void;
  onEdit: () => void;
}

export function VehicleDetailModal({ visible, vehicle, onClose, onEdit }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const [tooltipAmenity, setTooltipAmenity] = useState<VehicleAmenity | null>(null);

  const cardShadow = {
    shadowColor: theme.cardShadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.cardShadowOpacity,
    shadowRadius: 10,
    elevation: 5,
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: theme.background }}>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
          borderBottomWidth: 1, borderBottomColor: theme.border,
        }}>
          <Text style={{ fontSize: 18, fontFamily: theme.fontDisplay, color: theme.text, textTransform: 'uppercase', letterSpacing: 1 }}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Icon name="close" size={22} color={theme.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>

          {/* Photo */}
          <View style={{ borderRadius: 16, overflow: 'hidden', ...cardShadow, backgroundColor: theme.surface }}>
            {vehicle.photo_url ? (
              <Image
                source={{ uri: vehicle.photo_url }}
                style={{ width: '100%', height: 210 }}
                resizeMode="cover"
              />
            ) : (
              <View style={{
                width: '100%', height: 160,
                backgroundColor: theme.surfaceAlt,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="car" size={56} color={theme.border} />
              </View>
            )}
          </View>

          {/* Basic info card */}
          <View style={{
            backgroundColor: theme.surface, borderRadius: 16,
            padding: 18, ...cardShadow,
          }}>
            <Text style={{ color: theme.muted, fontSize: 11, fontFamily: theme.fontDisplay, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 }}>
              Vehicle Info
            </Text>
            <InfoRow label="Make"  value={vehicle.make}          theme={theme} />
            <InfoRow label="Model" value={vehicle.model}         theme={theme} />
            {vehicle.trim     && <InfoRow label="Trim"      value={vehicle.trim}              theme={theme} />}
            <InfoRow label="Year"  value={String(vehicle.year)}  theme={theme} />
            <InfoRow label="Color" value={vehicle.color}         theme={theme} last={!vehicle.fuel_type && !vehicle.seats} />
            {vehicle.fuel_type && <InfoRow label="Energy"   value={vehicle.fuel_type}          theme={theme} last={!vehicle.seats} />}
            {vehicle.seats     && <InfoRow label="Passenger Seats" value={String(vehicle.seats)} theme={theme} last />}
          </View>

          {/* Amenities card */}
          {vehicle.amenities.length > 0 && (
            <View style={{
              backgroundColor: theme.surface, borderRadius: 16,
              padding: 18, ...cardShadow,
            }}>
              <Text style={{ color: theme.muted, fontSize: 11, fontFamily: theme.fontDisplay, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16 }}>
                {t.profile.vehicleAmenities}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {vehicle.amenities.filter(a => a in AMENITY_LABELS).map(a => {
                  const detail = vehicle.amenity_details?.[a];
                  const hasDetail = detail && (detail.choices.length > 0 || detail.note.trim());
                  return (
                    <TouchableOpacity
                      key={a}
                      onPress={() => setTooltipAmenity(a)}
                      activeOpacity={0.7}
                      style={{ alignItems: 'center', gap: 5, width: 56 }}
                    >
                      <View style={{ position: 'relative' }}>
                        <View style={{
                          width: 44, height: 44, borderRadius: 22,
                          backgroundColor: theme.primary + '15',
                          borderWidth: 1, borderColor: theme.primary + '30',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon name={a as IconName} size={20} color={theme.primary} />
                        </View>
                        {hasDetail && (
                          <View style={{
                            position: 'absolute', top: 0, right: 0,
                            width: 8, height: 8, borderRadius: 4,
                            backgroundColor: theme.primary,
                          }} />
                        )}
                      </View>
                      <Text style={{
                        color: theme.muted, fontSize: 9, fontFamily: theme.fontDisplay,
                        textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3,
                      }}>
                        {AMENITY_LABELS[a] ?? a}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Amenity tooltip */}
          {tooltipAmenity && (() => {
            const detail = vehicle.amenity_details?.[tooltipAmenity];
            const choiceText = detail?.choices.join(' / ') ?? '';
            const note = detail?.note.trim() ?? '';
            return (
              <Modal transparent animationType="fade" visible onRequestClose={() => setTooltipAmenity(null)}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => setTooltipAmenity(null)}
                  activeOpacity={1}
                >
                  <View style={{
                    backgroundColor: theme.surface, borderRadius: 16,
                    paddingHorizontal: 20, paddingVertical: 16,
                    maxWidth: 280, minWidth: 180,
                    borderWidth: 1, borderColor: theme.primary + '30',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
                    gap: 4,
                  }}>
                    <Text style={{ color: theme.primary, fontFamily: theme.fontDisplay, fontSize: 14 }}>
                      {AMENITY_LABELS[tooltipAmenity] ?? tooltipAmenity}
                    </Text>
                    {choiceText ? (
                      <Text style={{ color: theme.text, fontSize: 13, fontFamily: theme.fontBody }}>
                        {choiceText}
                      </Text>
                    ) : null}
                    {note ? (
                      <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: theme.fontBody, lineHeight: 18 }}>
                        {note}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </Modal>
            );
          })()}

          {/* Insurance card */}
          {vehicle.insurance_self_certified && (
            <View style={{
              backgroundColor: theme.success + '12', borderRadius: 16,
              padding: 18, ...cardShadow,
              flexDirection: 'row', alignItems: 'center', gap: 14,
              borderWidth: 1, borderColor: theme.success + '30',
            }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: theme.success + '25',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="shield" size={22} color={theme.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.success, fontFamily: theme.fontDisplay, fontSize: 14 }}>
                  Insurance self-certified
                </Text>
                <Text style={{ color: theme.success, fontSize: 12, marginTop: 2, opacity: 0.75 }}>
                  Driver has confirmed personal insurance coverage
                </Text>
              </View>
            </View>
          )}

          {/* Edit CTA */}
          <TouchableOpacity
            onPress={() => { onClose(); setTimeout(onEdit, 300); }}
            style={{
              backgroundColor: theme.primary, borderRadius: 16,
              paddingVertical: 16, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center', gap: 8,
              marginTop: 4, ...cardShadow,
            }}
          >
            <Icon name="edit" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontFamily: theme.fontDisplay, fontSize: 16 }}>
              {t.profile.editVehicle}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </Modal>
  );
}

function InfoRow({ label, value, theme, last = false }: { label: string; value: string; theme: any; last?: boolean }) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.border,
    }}>
      <Text style={{ color: theme.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: theme.text, fontFamily: theme.fontDisplay, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 }}>{value}</Text>
    </View>
  );
}
