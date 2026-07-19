import { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal, Platform, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { Button } from '@/components/ui/Button';
import { KeyboardWrapper } from '@/components/auth/KeyboardWrapper';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useVehicleProfile } from '@/hooks/useVehicleProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { useSavedAddresses } from '@/hooks/useSavedAddresses';
import { RuleChip } from '@/components/ui/RuleChip';
import { ACCESSIBILITY_OPTIONS } from '@/constants/accessibilityOptions';
import { AccessibilityNeed } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts, shadows, radii } from '@/constants/themes';
import { tracking, leading, letterSpacingFor } from '@/constants/typography';
import { IconName } from '@/constants/icons';
import { addressBookSlots } from '@/constants/addressBookSlots';

// Danger-zone account deletion is a separate pass (needs a Supabase Edge
// Function — service-role key can't live in the app).
const ADDRESS_ICON_OPTIONS: IconName[] = [
  'addr_home', 'addr_work', 'addr_airport', 'addr_station', 'addr_general',
  'addr_church', 'addr_school', 'addr_factory', 'addr_store', 'addr_park',
];

// 5 icons per row, sized off the actual screen width rather than a percentage
// — percentage widths + a fixed `gap` don't divide evenly, which is what left
// the grid short of 5-per-line before.
const ICON_GRID_GAP = 12;
const ICON_GRID_COLUMNS = 5;
const ICON_GRID_SHEET_PADDING = 20;
const ICON_GRID_ITEM_SIZE = (
  Dimensions.get('window').width - ICON_GRID_SHEET_PADDING * 2 - ICON_GRID_GAP * (ICON_GRID_COLUMNS - 1)
) / ICON_GRID_COLUMNS;

// getCurrentPositionAsync doesn't reject when it can't get a GPS fix (common on
// emulators/indoors) — without a timeout the "area of work" prefill would just
// hang silently instead of leaving the field blank. Same fix as useWeather.ts.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

// Label + helper text on the same row (helper right-aligned) — the field
// label convention used throughout this screen, distinct from Input's own
// label (which renders alone, no helper slot on that row).
function FieldHeader({ label, helper }: { label: string; helper?: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 7, gap: 8 }}>
      <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12, letterSpacing: letterSpacingFor(12, tracking.wide), textTransform: 'uppercase', color: theme.text }}>
        {label}
      </Text>
      {helper ? (
        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.bodyMedium, fontSize: 11, color: theme.textFaint, textAlign: 'right' }}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

export default function EditProfileScreen() {
  const { profile, session } = useAuthStore();
  const { updateProfile, uploadAvatar, upsertLegalName, getLegalName, signIn, updatePassword } = useAuth();
  const { getMyVehicles } = useVehicleProfile();
  const { isFree } = useSubscription();
  const { getSavedAddresses, saveAddress, deleteAddress } = useSavedAddresses();
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [legalName, setLegalName] = useState('');
  const [homeCity, setHomeCity] = useState(profile?.home_city ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<AccessibilityNeed[]>(profile?.accessibility_needs ?? []);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const ADDRESS_SLOTS = addressBookSlots(t);
  const unlockedSlots = isFree ? 1 : 5;

  const [slotIcons, setSlotIcons] = useState<Record<string, IconName>>(
    Object.fromEntries(ADDRESS_SLOTS.map((s) => [s.id, s.icon]))
  );
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [pickingIconSlot, setPickingIconSlot] = useState<string | null>(null);

  // Visual only — real deletion needs a Supabase Edge Function (service-role
  // key can't live in the app), tracked as separate follow-up work.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const deleteArmed = deleteText.trim().toUpperCase() === 'DELETE';

  const displayAvatar = photoUri ?? profile?.avatar_url ?? undefined;
  const email = session?.user?.email ?? '';

  useEffect(() => {
    if (!profile) return;
    getLegalName(profile.id).then((v) => { if (v) setLegalName(v); }).catch(() => {});
    getMyVehicles(profile.id).then((vs) => setVerified(vs.some((v) => v.insurance_self_certified))).catch(() => {});
    getSavedAddresses().then((rows) => {
      if (rows.length === 0) return;
      setSlotValues((prev) => {
        const next = { ...prev };
        rows.forEach((r) => { next[r.slot_id] = r.value; });
        return next;
      });
      setSlotIcons((prev) => {
        const next = { ...prev };
        rows.forEach((r) => { next[r.slot_id] = r.icon as IconName; });
        return next;
      });
    }).catch(() => {});

    // Only suggest a GPS-detected city if one isn't already saved — never
    // overwrite what the user already chose.
    if (!profile.home_city) {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const pos = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }), 6000);
          const [place] = await withTimeout(
            Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            4000
          );
          if (place?.city) setHomeCity(place.city);
        } catch {}
      })();
    }
  }, [profile?.id]);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.profile.photoPermissionTitle, t.profile.photoPermissionMsg);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;
      if (photoUri) avatarUrl = await uploadAvatar(profile.id, photoUri);
      await Promise.all([
        updateProfile(profile.id, {
          full_name: fullName.trim() || profile.full_name,
          avatar_url: avatarUrl,
          home_city: homeCity.trim() || undefined,
          bio: bio.trim() || undefined,
          accessibility_needs: accessibilityNeeds,
        }),
        legalName.trim() ? upsertLegalName(profile.id, legalName.trim()) : Promise.resolve(),
      ]);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePassword() {
    if (newPassword.length < 8) {
      Alert.alert('', t.profile.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('', t.profile.passwordsDontMatch);
      return;
    }
    setChangingPassword(true);
    try {
      // Supabase's updateUser({password}) only needs the current session — it
      // doesn't ask for the current password itself, so it's verified here by
      // re-authenticating with it first (fails harmlessly if wrong, doesn't
      // touch the existing session otherwise since the same user signs back in).
      try {
        await signIn(email, currentPassword);
      } catch {
        Alert.alert('', t.profile.currentPasswordIncorrect);
        return;
      }
      await updatePassword(newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('', t.profile.passwordUpdated);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 12, paddingBottom: 28, alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, ...shadows.lg }}
      >
        <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
          <IconButton icon="arrow_back" variant="glass" shadow={shadows.xs} label={t.auth.back} onPress={() => router.back()} />
          <Text style={{
            flex: 1, textAlign: 'center', marginRight: 44,
            fontFamily: fonts.bodyExtraBold, fontSize: 12,
            letterSpacing: letterSpacingFor(12, tracking.wide), textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.85)',
          }}>
            {t.profile.editProfileTitle}
          </Text>
        </View>

        <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} style={{ marginTop: 16 }}>
          <View style={{ padding: 3, borderRadius: 51, backgroundColor: 'rgba(255,255,255,0.9)', ...shadows.md }}>
            <Avatar
              name={profile?.full_name ?? ''}
              src={displayAvatar}
              photo={!!displayAvatar}
              icon={!displayAvatar ? 'person' : undefined}
              size={90}
              verified={verified}
            />
          </View>
          <View style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 30, height: 30, borderRadius: 15,
            backgroundColor: theme.secondary,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 2.5, borderColor: theme.tabBarBg,
          }}>
            <Icon name="camera" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </LinearGradient>

      <View style={{ flex: 1 }}>
        <KeyboardWrapper>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: theme.text, marginBottom: 16 }}>
            {t.profile.identitySection}
          </Text>

          <View style={{ marginBottom: 20 }}>
            <FieldHeader label={t.profile.emailLabel} />
            <Input icon="email" value={email} editable={false} rightElement={<Icon name="lock" size={16} color={theme.muted} />} style={{ color: theme.muted }} />
          </View>

          <View style={{ marginBottom: 20 }}>
            <FieldHeader label={t.profile.displayNameLabel} helper={t.profile.displayNameHelper} />
            <Input icon="person" value={fullName} onChangeText={setFullName} placeholder={t.profile.displayNamePlaceholder} maxLength={16} />
          </View>

          <View style={{ marginBottom: 20 }}>
            <FieldHeader label={t.profile.legalNameLabel} helper={t.profile.legalNameHelper} />
            <Input icon="shield" value={legalName} onChangeText={setLegalName} placeholder={t.profile.legalNamePlaceholder} />
          </View>

          <View style={{ marginBottom: 20 }}>
            <FieldHeader label={t.profile.areaOfWorkLabel} helper={t.profile.areaOfWorkHelper} />
            <Input icon="location" value={homeCity} onChangeText={setHomeCity} placeholder={t.profile.areaOfWorkPlaceholder} />
          </View>

          <View style={{ marginBottom: 32 }}>
            <FieldHeader label={t.profile.aboutMeLabel} helper={t.profile.aboutMeHelper} />
            <View style={{
              backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border,
              borderRadius: 14, padding: 14, ...shadows.xs,
            }}>
              <TextInput
                value={bio}
                onChangeText={(v) => setBio(v.slice(0, 280))}
                placeholder={t.profile.aboutMePlaceholder}
                placeholderTextColor={theme.muted}
                multiline
                numberOfLines={4}
                maxLength={280}
                style={{
                  fontFamily: fonts.bodyMedium, fontSize: 14.5, color: theme.text,
                  minHeight: 80, textAlignVertical: 'top',
                }}
              />
              <Text style={{ alignSelf: 'flex-end', marginTop: 6, fontFamily: fonts.bodyMedium, fontSize: 11, color: theme.textFaint }}>
                {bio.length}/280
              </Text>
            </View>
          </View>

          <Button variant="primary" fullWidth onPress={handleSave} disabled={saving}>
            {saving ? t.profile.saving : t.profile.saveChanges}
          </Button>
          {saving && <ActivityIndicator style={{ marginTop: 12 }} color={theme.primary} />}

          <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: theme.text, marginTop: 32, marginBottom: 16 }}>
            {t.profile.passwordSection}
          </Text>

          <View style={{ marginBottom: 20 }}>
            <FieldHeader label={t.profile.currentPasswordLabel} />
            <Input icon="lock" value={currentPassword} onChangeText={setCurrentPassword} placeholder={t.profile.currentPasswordPlaceholder} secureTextEntry />
          </View>

          <View style={{ marginBottom: 20 }}>
            <FieldHeader label={t.profile.newPasswordLabel} helper={t.profile.newPasswordHelper} />
            <Input icon="lock" value={newPassword} onChangeText={setNewPassword} placeholder={t.profile.newPasswordPlaceholderShort} secureTextEntry />
          </View>

          <View style={{ marginBottom: 24 }}>
            <FieldHeader label={t.profile.confirmPasswordLabel} />
            <Input icon="lock" value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t.profile.confirmPasswordPlaceholder} secureTextEntry />
          </View>

          <Button
            variant="outline"
            fullWidth
            onPress={handleUpdatePassword}
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
          >
            {changingPassword ? t.profile.saving : t.profile.updatePasswordButton}
          </Button>
          {changingPassword && <ActivityIndicator style={{ marginTop: 12 }} color={theme.primary} />}

          <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: theme.text, marginTop: 32, marginBottom: 6 }}>
            Accessibility
          </Text>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.muted, marginBottom: 16, lineHeight: 18 }}>
            Shared with drivers so they know what to expect — shown as requested, not guaranteed. These also appear pre-selected whenever you post a ride, but changing them there won't change this list.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
            {ACCESSIBILITY_OPTIONS.map((opt) => (
              <RuleChip
                key={opt.id}
                active={accessibilityNeeds.includes(opt.id)}
                icon={opt.icon}
                accent={theme.primary}
                theme={theme}
                onPress={() => setAccessibilityNeeds((prev) =>
                  prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id]
                )}
              >
                {opt.label}
              </RuleChip>
            ))}
          </View>

          <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: theme.text, marginBottom: 16 }}>
            {t.profile.addressBookSection}
          </Text>

          {ADDRESS_SLOTS.map((slot, index) => {
            const locked = index >= unlockedSlots;
            const value = slotValues[slot.id];
            const isEditing = editingSlot === slot.id;
            return (
              <View
                key={slot.id}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: theme.surface,
                  borderWidth: 1.5, borderStyle: locked ? 'dashed' : 'solid',
                  borderColor: locked ? theme.border : theme.cardBorder,
                  borderRadius: radii.lg, padding: 14, marginBottom: 12,
                  opacity: locked ? 0.55 : 1, ...shadows.xs,
                  zIndex: isEditing ? 10 : 1,
                  elevation: isEditing ? 10 : 1,
                }}
              >
                <TouchableOpacity
                  disabled={locked}
                  onPress={() => setPickingIconSlot(slot.id)}
                  activeOpacity={0.7}
                  style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name={slotIcons[slot.id]} size={21} color={theme.gold400} />
                  <View style={{
                    position: 'absolute', bottom: -3, right: -3,
                    width: 14, height: 14, borderRadius: 7,
                    backgroundColor: theme.gold400,
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: 'rgba(0,0,0,0.3)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4,
                    elevation: 2,
                  }}>
                    <Icon name="pencil_line" size={8} color="#000000" strokeWidth={2} />
                  </View>
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{
                      fontFamily: fonts.bodyExtraBold, fontSize: 11, lineHeight: 11,
                      letterSpacing: letterSpacingFor(11, 0.06), textTransform: 'uppercase',
                      color: theme.textFaint,
                    }}>
                      {slot.label}
                    </Text>
                    <View style={{ marginTop: 1 }}>
                      <Icon name="pencil_line" size={9} color={theme.textFaint} strokeWidth={2} />
                    </View>
                  </View>
                  {isEditing ? (
                    <AddressAutocomplete
                      autoFocus
                      variant="plain"
                      value={value ?? ''}
                      onChangeText={(v) => setSlotValues((prev) => ({ ...prev, [slot.id]: v }))}
                      onSelectPlace={(detail) => setSlotValues((prev) => ({ ...prev, [slot.id]: detail.formattedAddress }))}
                      placeholder={t.profile.addressPlaceholder}
                      textStyle={{ marginTop: 1 }}
                      onBlur={() => {
                        const trimmed = (value ?? '').trim();
                        if (trimmed) {
                          saveAddress(slot.id, trimmed, slotIcons[slot.id]).catch((e: any) => Alert.alert('Error', e.message));
                        } else {
                          deleteAddress(slot.id).catch(() => {});
                        }
                        setTimeout(() => setEditingSlot((cur) => (cur === slot.id ? null : cur)), 150);
                      }}
                    />
                  ) : (
                    <TouchableOpacity
                      disabled={locked}
                      activeOpacity={0.6}
                      onPress={() => {
                        if (locked) {
                          Alert.alert('', t.profile.addressLockedMsg);
                          return;
                        }
                        setEditingSlot(slot.id);
                      }}
                    >
                      <Text numberOfLines={1} style={{
                        fontFamily: value ? fonts.bodyMedium : fonts.bodySemibold,
                        fontSize: value ? 13 : 13.5,
                        color: value ? theme.muted : theme.textFaint,
                        marginTop: 1,
                      }}>
                        {value || t.profile.addressNotSet}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          <Text style={{
            fontFamily: fonts.displayBold, fontSize: 17,
            letterSpacing: letterSpacingFor(17, -0.01), color: theme.danger,
            marginTop: 32,
          }}>
            {t.profile.dangerZoneTitle}
          </Text>
          <View style={{
            marginTop: 12, borderRadius: radii.lg, borderWidth: 1,
            borderColor: theme.passengerBorder, backgroundColor: theme.passengerSoft, padding: 16,
          }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="delete" size={19} color={theme.danger} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: theme.text }}>
                  {t.profile.deleteAccountTitle}
                </Text>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.muted, marginTop: 2, lineHeight: Math.round(12.5 * 1.45) }}>
                  {t.profile.deleteAccountDesc}
                </Text>
              </View>
            </View>

            {!confirmDelete ? (
              <Button
                variant="outline"
                fullWidth
                textColor={theme.danger}
                style={{ marginTop: 14, borderColor: theme.danger }}
                onPress={() => setConfirmDelete(true)}
              >
                {t.profile.deleteMyAccountButton}
              </Button>
            ) : (
              <View style={{ marginTop: 14, gap: 11 }}>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.textSecondary }}>
                  {t.profile.deleteConfirmPrompt}
                </Text>
                <TextInput
                  value={deleteText}
                  onChangeText={setDeleteText}
                  placeholder={t.profile.deletePlaceholder}
                  placeholderTextColor={theme.muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={{
                    height: 48, borderRadius: radii.md, borderWidth: 1.5, borderColor: theme.border,
                    backgroundColor: theme.surface, paddingHorizontal: 14,
                    fontFamily: fonts.bodyMedium, fontSize: 15, letterSpacing: letterSpacingFor(15, 0.08),
                    color: theme.text,
                  }}
                />
                <View style={{ flexDirection: 'row', gap: 11 }}>
                  <View style={{ flex: 1 }}>
                    <Button variant="ghost" fullWidth onPress={() => { setConfirmDelete(false); setDeleteText(''); }}>
                      {t.profile.cancel}
                    </Button>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      variant="danger"
                      fullWidth
                      disabled={!deleteArmed}
                      onPress={() => Alert.alert(t.profile.comingSoonTitle, t.profile.comingSoonMsg)}
                    >
                      {t.profile.deleteForeverButton}
                    </Button>
                  </View>
                </View>
              </View>
            )}
          </View>
          </ScrollView>
        </KeyboardWrapper>
        {/* Fields fade into the background as they scroll toward the fixed
            header instead of hard-cutting at its edge — same technique as
            the Feed screen's header and profile.tsx's stats card. */}
        <LinearGradient
          colors={[theme.background, `${theme.background}00`]}
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 28 }}
        />
      </View>

      <Modal
        visible={pickingIconSlot !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPickingIconSlot(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setPickingIconSlot(null)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{
              backgroundColor: theme.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
              padding: 20, paddingBottom: insets.bottom + 20,
              // A real backgroundColor + elevation follows the view's own rounded
              // corners on Android (unlike a rectangular gradient overlay, which
              // reads as a flat cut-line across both top corners instead of curving
              // with them — same lesson learned from the profile stats card).
              ...(Platform.OS === 'ios'
                ? { shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.2, shadowRadius: 20 }
                : { elevation: 24 }),
            }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: theme.text, marginBottom: 16, textAlign: 'center' }}>
                {t.profile.chooseIconTitle}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ICON_GRID_GAP }}>
                {ADDRESS_ICON_OPTIONS.map((opt) => {
                  const selected = pickingIconSlot !== null && slotIcons[pickingIconSlot] === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (pickingIconSlot) {
                          setSlotIcons((prev) => ({ ...prev, [pickingIconSlot]: opt }));
                          const existingValue = slotValues[pickingIconSlot]?.trim();
                          if (existingValue) {
                            saveAddress(pickingIconSlot, existingValue, opt).catch(() => {});
                          }
                        }
                        setPickingIconSlot(null);
                      }}
                      style={{
                        width: ICON_GRID_ITEM_SIZE, height: ICON_GRID_ITEM_SIZE, borderRadius: 14,
                        backgroundColor: theme.surfaceAlt,
                        borderWidth: 1.5, borderColor: selected ? theme.gold400 : 'transparent',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Icon name={opt} size={22} color={selected ? theme.gold400 : theme.muted} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
