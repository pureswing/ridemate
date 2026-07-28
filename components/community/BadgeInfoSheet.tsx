import { BottomSheet } from '@/components/ui/BottomSheet';
import { BadgeDetail } from './BadgeDetail';
import { useTheme } from '@/hooks/useTheme';
import { BadgeType } from '@/types';

interface Props {
  badge: BadgeType | null;
  count?: number;
  onClose: () => void;
}

// Tapping a badge in a "Community badges" row (own profile or another
// user's) opens this — the same BadgeDetail card shown when expanding a
// badge in the completion-review grid, plus how many times it's been
// awarded, in a plain bottom sheet.
export function BadgeInfoSheet({ badge, count, onClose }: Props) {
  const theme = useTheme();

  return (
    <BottomSheet visible={!!badge} onClose={onClose} backgroundColor={theme.background} style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
      {badge && <BadgeDetail badge={badge} count={count} />}
    </BottomSheet>
  );
}
