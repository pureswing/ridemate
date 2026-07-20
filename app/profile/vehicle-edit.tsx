import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { IconButton } from '@/components/ui/IconButton';
import { VehicleEditForm } from '@/components/profile/VehicleEditForm';
import { useAuthStore } from '@/store/authStore';
import { useVehicleProfile } from '@/hooks/useVehicleProfile';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { VehicleKind, VehicleProfile } from '@/types';

// Routed full-screen entry point for vehicle create/edit — see
// components/profile/VehicleEditForm.tsx for the shared form.
export default function VehicleEditScreen() {
  // `mode` is passed by the caller (profile.tsx already knows whether a
  // vehicle exists for this kind before navigating here) so the header title
  // is correct on the very first frame — otherwise it briefly shows "Add
  // Vehicle" (existing still null while the fetch is in flight) before
  // flipping to "Edit Vehicle" once it resolves.
  const { kind, mode } = useLocalSearchParams<{ kind: VehicleKind; mode?: 'add' | 'edit' }>();
  const { profile } = useAuthStore();
  const { getMyVehicle } = useVehicleProfile();
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  const [existing, setExisting] = useState<VehicleProfile | null>(null);
  const [otherVehicle, setOtherVehicle] = useState<VehicleProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const vehicleKind: VehicleKind = kind === 'hauling' ? 'hauling' : 'rides_courier';
  const otherKind: VehicleKind = vehicleKind === 'hauling' ? 'rides_courier' : 'hauling';

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      getMyVehicle(profile.id, vehicleKind),
      getMyVehicle(profile.id, otherKind),
    ])
      .then(([mine, other]) => { setExisting(mine); setOtherVehicle(other); })
      .finally(() => setLoading(false));
  }, [profile?.id, vehicleKind]);

  const kindLabel = vehicleKind === 'hauling' ? t.profile.haulingCategory : t.profile.ridesCourierCategory;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {kindLabel}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ paddingHorizontal: 22, paddingTop: 10 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 24, letterSpacing: letterSpacingFor(24, tracking.tight), color: theme.cream }}>
            {(mode ? mode === 'edit' : !!existing) ? t.profile.editVehicle : t.profile.addVehicle}
          </Text>
        </View>
      </LinearGradient>

      {loading || !profile ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.primary} />
      ) : (
        <VehicleEditForm
          style={{ flex: 1 }}
          userId={profile.id}
          kind={vehicleKind}
          existing={existing}
          otherVehicle={otherVehicle}
          otherVehicleLabel={otherKind === 'hauling' ? t.profile.haulingCategory : t.profile.ridesCourierCategory}
          onCancel={() => router.back()}
          onSaved={() => router.back()}
          onDelete={() => router.back()}
          hideHeader
        />
      )}
    </View>
  );
}
