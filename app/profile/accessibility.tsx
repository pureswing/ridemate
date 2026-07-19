import { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { ACCESSIBILITY_OPTIONS } from '@/constants/accessibilityOptions';
import { AccessibilityNeed } from '@/types';

// Ported from ui_kits/ridemate-app/Accessibility.jsx. Same self-reported,
// no-guarantee framing as the rest of the app's accessibility support — see
// constants/accessibilityOptions.ts and app/post/ride.tsx's comments on the
// one-way default-inherit relationship with the ride post form.
export default function AccessibilityScreen() {
  const { profile } = useAuthStore();
  const { updateProfile } = useAuth();
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  const [active, setActive] = useState<AccessibilityNeed[]>(profile?.accessibility_needs ?? []);
  const [note, setNote] = useState(profile?.accessibility_note ?? '');
  const [saving, setSaving] = useState(false);

  function toggle(id: AccessibilityNeed) {
    setActive((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile(profile.id, {
        accessibility_needs: active,
        accessibility_note: note.trim() || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 22, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg, zIndex: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {t.profile.accessibilityCategory}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ paddingHorizontal: 22, paddingTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm }}>
              <Icon name="accessible" size={21} color={theme.text} />
            </View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 24, letterSpacing: letterSpacingFor(24, tracking.tight), color: theme.cream }}>
              {t.profile.accessibilityScreenTitle}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8, lineHeight: 19 }}>
            {t.profile.accessibilityScreenSubtitle}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" removeClippedSubviews={false} contentContainerStyle={{ padding: 20, gap: 22, paddingBottom: 40 }}>
        <View style={{ gap: 10 }}>
          {ACCESSIBILITY_OPTIONS.map((opt) => {
            const isActive = active.includes(opt.id);
            return (
              <View
                key={opt.id}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 13,
                  backgroundColor: theme.surface,
                  borderWidth: 1.5, borderColor: isActive ? theme.borderGold : theme.border,
                  borderRadius: radii.md, padding: 14,
                  ...(isActive ? shadows.sm : shadows.xs),
                }}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isActive ? theme.gold400 : theme.surfaceAlt,
                }}>
                  <Icon name={opt.icon} size={21} color={isActive ? '#fff' : theme.textSecondary} strokeWidth={2.1} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, letterSpacing: letterSpacingFor(16, tracking.tight), color: theme.text }}>
                    {opt.label}
                  </Text>
                  <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.muted, marginTop: 3, lineHeight: 17 }}>
                    {opt.desc}
                  </Text>
                </View>
                <Switch checked={isActive} onChange={() => toggle(opt.id)} size="md" />
              </View>
            );
          })}
        </View>

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 11 }}>
            <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: letterSpacingFor(12, tracking.wide), color: theme.textFaint }}>
              {t.profile.accessibilityNoteLabel}
            </Text>
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint }}>{t.profile.accessibilityNoteOptional}</Text>
          </View>
          <Input
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            placeholder={t.profile.accessibilityNotePlaceholder}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 11, borderRadius: radii.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceAlt, padding: 14 }}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="shield" size={17} color={theme.gold400} />
          </View>
          <Text style={{ flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.muted, lineHeight: 18 }}>
            {t.profile.accessibilityPrivacyNote}
          </Text>
        </View>
      </ScrollView>

      <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, backgroundColor: theme.surface, padding: 16, paddingBottom: insets.bottom + 16 }}>
        <Button variant="primary" size="lg" fullWidth disabled={saving} onPress={handleSave}>
          {saving ? t.profile.saving : t.profile.saveChanges}
        </Button>
      </View>
    </View>
  );
}
