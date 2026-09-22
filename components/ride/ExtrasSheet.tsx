import { useState } from 'react';
import { View, Pressable } from 'react-native';
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

// Real drag-to-scroll inside a plain RN Modal is unreliable on some Android
// devices/firmwares (confirmed on the Armor 34 test device: taps work,
// drags inside the Modal silently don't, even though the same ScrollView
// scrolled fine when driven programmatically — a device/OS touch quirk, not
// a bug in the ScrollView setup). Tap-to-reveal pagination by category
// sidesteps needing any drag gesture inside the sheet.
const GROUP_PAGE_SIZE = 3;

// Shared by RideCard.tsx and RideCardGrid.tsx's "extras" (car_front) icon —
// see utils/postExtras.ts for what's in `groups` and why accessibility is
// excluded from it.
export function ExtrasSheet({ visible, onClose, groups }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const [shown, setShown] = useState(GROUP_PAGE_SIZE);

  return (
    <BottomSheet visible={visible} onClose={() => { onClose(); setShown(GROUP_PAGE_SIZE); }} style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.gold400 + '24', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="car_front" size={18} color={theme.gold500} />
        </View>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: theme.text }}>{t.feed.extrasTitle}</Text>
      </View>
      <View style={{ gap: 18 }}>
        {groups.slice(0, shown).map((group) => (
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
        {shown < groups.length && (
          <Pressable
            onPress={() => setShown((n) => n + GROUP_PAGE_SIZE)}
            style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radii.md, borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed' }}
          >
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: theme.gold500 }}>
              {t.feed.showMoreCount.replace('{count}', String(groups.length - shown))}
            </Text>
          </Pressable>
        )}
      </View>
    </BottomSheet>
  );
}
