import { View } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { BadgeGlyph } from './BadgeGlyph';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { BadgeType } from '@/types';
import { BADGE_ICONS } from '@/constants/badgeIcons';
import { fonts, radii, shadows } from '@/constants/themes';

interface Props {
  badge: BadgeType;
}

// The description/category card for whichever badge is currently expanded
// in a BadgeSelector grid — render exactly one below the whole grid (never
// one per badge), matching components/ride/CommunityBadge.jsx's
// CommunityBadgeDetail: opening a badge only ever grows the space below
// the grid, the medallions above it never reflow.
export function BadgeDetail({ badge }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const { color, category } = BADGE_ICONS[badge];

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      marginTop: 10, padding: 14, borderRadius: radii.md,
      backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.cardBorder,
      ...shadows.sm,
    }}>
      <BadgeGlyph badge={badge} size={50} color={color} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: theme.text }}>
            {t.badges[badge]}
          </Text>
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill, backgroundColor: color + '1E' }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, color }}>
              {t.badges.category[category]}
            </Text>
          </View>
        </View>
        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.muted, lineHeight: 18 }}>
          {t.badges.desc[badge]}
        </Text>
      </View>
    </View>
  );
}
