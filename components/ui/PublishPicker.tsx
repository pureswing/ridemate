import { View, Pressable } from 'react-native';
import { ThemedText as Text } from './ThemedText';
import { Icon } from './Icon';
import { BottomSheet } from './BottomSheet';
import { IconName } from '@/constants/icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts, radii } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPublic: () => void;
  onPrivate: () => void;
  // Whether the poster has any saved (favorited) drivers in this post's
  // origin city — computed by the caller via useFavorites().countFavoritesInCity,
  // gated by Settings' trusted_drivers_first master toggle (see
  // app/post/{ride,package,hauling}.tsx's submit-button onPress).
  hasSaved: boolean;
  accent: string;
  icon: IconName;
}

// Bottom-sheet shown when tapping a post's submit button — lets the user
// choose public vs. saved-drivers-first visibility before the post actually
// goes out. Matches ui_kits/ridemate-app/PublishPicker.jsx. onPrivate submits
// with visibility='private' + a goes_public_at delay (see the post screens'
// handleSubmit) — only reachable when hasSaved is true.
export function PublishPicker({ visible, onClose, onPublic, onPrivate, hasSaved, accent, icon }: Props) {
  const theme = useTheme();
  const t = useTranslation();

  return (
    <BottomSheet visible={visible} onClose={onClose} style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 21, letterSpacing: letterSpacingFor(21, tracking.tight), color: theme.text, marginBottom: 4 }}>
              {t.postVisibility.title}
            </Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: theme.muted, marginBottom: 22, lineHeight: 20 }}>
              {t.postVisibility.subtitle}
            </Text>

            <View style={{ gap: 12 }}>
              <Pressable
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
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, letterSpacing: letterSpacingFor(16, tracking.tight), color: theme.text }}>
                    {t.postVisibility.savedDriversTitle}
                  </Text>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.muted, marginTop: 3, lineHeight: 18 }}>
                    {hasSaved ? t.postVisibility.savedDriversDescAvailable : t.postVisibility.savedDriversDescEmpty}
                  </Text>
                </View>
                <Icon name="chevron_right" size={18} color={hasSaved ? accent : theme.textFaint} />
              </Pressable>

              <Pressable
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
              </Pressable>
            </View>

            <Pressable
              onPress={onClose}
              style={{ marginTop: 14, height: 44, borderRadius: radii.md, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.muted }}>{t.postVisibility.cancel}</Text>
            </Pressable>
    </BottomSheet>
  );
}
