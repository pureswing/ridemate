import { View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { RouteLine } from './RouteLine';
import { RidePost } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { IconName } from '@/constants/icons';

interface Props {
  post: RidePost;
}

const KIND_ROUTE: Record<RidePost['kind'], '/ride/[id]' | '/package/[id]' | '/hauling/[id]'> = {
  ride: '/ride/[id]',
  package: '/package/[id]',
  hauling: '/hauling/[id]',
};

// Same row treatment as Calendar/This week's RideRow (app/(tabs)/calendar.tsx,
// app/(tabs)/thisweek.tsx) — used here for a public profile's own post
// listings instead of matched agreements, so there's no counterpart name or
// completed/cancelled stamp to show (a bare post has neither yet).
export function PostRow({ post }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const isOffer = post.type === 'offer';

  const kindConfig: Record<RidePost['kind'], { accent: string; icon: IconName; label: string }> = {
    ride: { accent: isOffer ? theme.driverText : theme.passengerText, icon: isOffer ? 'car' : 'passenger', label: isOffer ? t.feed.chipPooling : t.feed.chipRide },
    package: { accent: theme.courierText, icon: 'package', label: t.post.chooserPackageTitle },
    hauling: { accent: theme.haulingText, icon: 'truck', label: t.post.chooserHaulingTitle },
  };
  const config = kindConfig[post.kind];
  const scheduledAt = new Date(post.scheduled_at);

  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: KIND_ROUTE[post.kind], params: { id: post.id } })}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 13,
          backgroundColor: theme.surface, borderRadius: radii.md, borderWidth: 1, borderColor: theme.cardBorder,
          paddingVertical: 14, paddingHorizontal: 14, minHeight: 78, overflow: 'hidden',
          ...shadows.xs,
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: config.accent + '1F' }}>
          <Icon name={config.icon} size={20} color={config.accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <RouteLine
            origin={post.origin_city}
            destination={post.destination_city !== post.origin_city ? post.destination_city : undefined}
            fontSize={14}
            style={{ marginBottom: 6 }}
          />
          <View style={{
            alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 1, borderRadius: radii.pill,
            backgroundColor: config.accent + '1E', borderWidth: 1, borderColor: config.accent,
          }}>
            <Text
              style={{
                fontFamily: fonts.bodyExtraBold, fontSize: 10, textTransform: 'uppercase',
                letterSpacing: letterSpacingFor(10, tracking.wide), color: config.accent,
                // includeFontPadding:false strips Android's default extra
                // vertical padding around custom TTFs — without it this bold
                // font sits visibly off-center inside the pill (see the
                // FilterDrawer.tsx seat-availability chip fix for the same issue).
                includeFontPadding: false,
                textAlignVertical: 'center',
              }}
            >
              {config.label}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint, marginTop: 3 }}>
            {scheduledAt.toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })} · {scheduledAt.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {post.suggested_donation != null && (
          <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 13, color: config.accent, flexShrink: 0 }}>
            {post.price_mode === 'firm' ? `$${post.suggested_donation}` : `$${post.suggested_donation} OBO`}
          </Text>
        )}
      </TouchableOpacity>
      {/* Sibling of the bordered/clipped row above, not nested inside it —
          matches components/ui/Card.tsx's accentStripe technique (see
          calendar.tsx/thisweek.tsx's RideRow for the full explanation). */}
      <View style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: radii.md + 6,
        backgroundColor: 'transparent', borderLeftWidth: 4, borderLeftColor: config.accent,
        borderTopLeftRadius: radii.md, borderBottomLeftRadius: radii.md, overflow: 'hidden',
      }} />
    </View>
  );
}
