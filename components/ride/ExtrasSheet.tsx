import { View, ScrollView, useWindowDimensions } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts, radii } from '@/constants/themes';
import { ExtrasGroup } from '@/utils/postExtras';

interface Props {
  visible: boolean;
  onClose: () => void;
  groups: ExtrasGroup[];
}

// Shared by RideCard.tsx and RideCardGrid.tsx's "extras" (car_front) icon —
// see utils/postExtras.ts for what's in `groups` and why accessibility is
// excluded from it.
export function ExtrasSheet({ visible, onClose, groups }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const { height: screenHeight } = useWindowDimensions();

  return (
    <BottomSheet visible={visible} onClose={onClose} style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.gold400 + '24', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="car_front" size={18} color={theme.gold500} />
        </View>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: theme.text }}>{t.feed.extrasTitle}</Text>
      </View>
      {/* A fixed pixel maxHeight, not flex:1 or a %-based one — the parent
          BottomSheet wrapper has no defined height of its own (it sizes to
          its content), so a flex:1 child has nothing to resolve "remaining
          space" against and collapses to 0. With a post that has several
          populated categories, the list is taller than one screen anyway;
          without a real cap here, Views don't clip overflow by default (no
          overflow:hidden), so the excess used to render past the sheet's
          own white background, over the dimmed backdrop/tab bar underneath
          — read as a "transparent band" at the bottom. ScrollView clips to
          its own bounds and scrolls instead. */}
      <ScrollView style={{ maxHeight: screenHeight * 0.5 }} contentContainerStyle={{ gap: 18, paddingBottom: 4 }} showsVerticalScrollIndicator={false}>
        {groups.map((group) => (
          <View key={group.label}>
            <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: theme.textFaint, marginBottom: 8 }}>
              {group.label}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {group.items.map((item) => (
                <View key={item} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.pill, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceAlt }}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.text }}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}
