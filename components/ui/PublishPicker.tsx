import { Modal, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TouchableOpacity } from './TouchableOpacity';
import { ThemedText as Text } from './ThemedText';
import { Icon } from './Icon';
import { IconName } from '@/constants/icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts, radii } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPublic: () => void;
  onPrivate: () => void;
  // Whether the user has any saved drivers to send a private post to first —
  // always false for now (no Saved Drivers backing data yet), which honestly
  // reflects the app's current state rather than faking availability.
  hasSaved: boolean;
  accent: string;
  icon: IconName;
}

// Bottom-sheet shown when tapping a post's submit button — lets the user
// choose public vs. saved-drivers-first visibility before the post actually
// goes out. Matches ui_kits/ridemate-app/PublishPicker.jsx. Visual only for
// now; onPrivate is unreachable while hasSaved is false.
export function PublishPicker({ visible, onClose, onPublic, onPrivate, hasSaved, accent, icon }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={{
            position: 'relative',
            backgroundColor: theme.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
            padding: 20, paddingBottom: insets.bottom + 20,
          }}>
            {/* Fills any gap below the safe-area padding on devices where
                useSafeAreaInsets() under-reports inside a Modal's own native
                root (gesture-nav Android in particular). */}
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: -40, height: 40, backgroundColor: theme.surface }} />
            <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 20 }} />

            <Text style={{ fontFamily: fonts.displayBold, fontSize: 21, letterSpacing: letterSpacingFor(21, tracking.tight), color: theme.text, marginBottom: 4 }}>
              {t.postVisibility.title}
            </Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: theme.muted, marginBottom: 22, lineHeight: 20 }}>
              {t.postVisibility.subtitle}
            </Text>

            <View style={{ gap: 12 }}>
              <TouchableOpacity
                disabled={!hasSaved}
                onPress={hasSaved ? onPrivate : undefined}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: radii.lg,
                  borderWidth: 1.5, borderColor: hasSaved ? accent : theme.border,
                  backgroundColor: hasSaved ? theme.surface : theme.surfaceAlt,
                  opacity: hasSaved ? 1 : 0.55,
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="passenger" size={24} color={hasSaved ? accent : theme.textFaint} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, letterSpacing: letterSpacingFor(16, tracking.tight), color: theme.text }}>
                      {t.postVisibility.savedDriversTitle}
                    </Text>
                    {hasSaved && (
                      <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: letterSpacingFor(10, tracking.wide), color: accent, backgroundColor: theme.surfaceAlt, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radii.pill }}>
                        {t.postVisibility.savedDriversBadge}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.muted, marginTop: 3, lineHeight: 18 }}>
                    {hasSaved ? t.postVisibility.savedDriversDescAvailable : t.postVisibility.savedDriversDescEmpty}
                  </Text>
                </View>
                <Icon name="chevron_right" size={18} color={hasSaved ? accent : theme.textFaint} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onPublic}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: radii.lg,
                  borderWidth: 1.5, borderColor: accent, backgroundColor: theme.surface,
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="globe" size={24} color={accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, letterSpacing: letterSpacingFor(16, tracking.tight), color: theme.text }}>
                    {t.postVisibility.publicTitle}
                  </Text>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.muted, marginTop: 3, lineHeight: 18 }}>
                    {t.postVisibility.publicDesc}
                  </Text>
                </View>
                <Icon name="chevron_right" size={18} color={accent} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{ marginTop: 14, height: 44, borderRadius: radii.md, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.muted }}>{t.postVisibility.cancel}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
      </GestureHandlerRootView>
    </Modal>
  );
}
