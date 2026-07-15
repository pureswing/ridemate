import { View, StyleProp, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { RouteLine } from './RouteLine';
import { RidePost } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts, radii, shadows } from '@/constants/themes';

interface Props {
  post: RidePost;
  style?: StyleProp<ViewStyle>;
}

// 0-999 as-is, 1000+ compact to "1K".."999K".
function formatCount(n: number): string {
  if (n < 1000) return String(n);
  return `${Math.floor(n / 1000)}K`;
}

function Meta({ icon, text }: { icon: 'event' | 'schedule' | 'seat_recline'; text: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name={icon} size={13} color={theme.muted} />
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.textSecondary }}>{text}</Text>
    </View>
  );
}

// RideCard — the core feed unit. offer (driver/pooling) vs request (passenger/ride)
// drives the badge + accent color, matching the design system's RideCard. The
// design's `kind` (package/hauling), accessibility, airport, and price-tier-analysis
// props don't exist in ride_posts yet, so this only ports the "ride" case for now.
export function RideCard({ post, style }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const isOffer = post.type === 'offer';
  const accent = isOffer ? theme.offer : theme.request;
  const date = new Date(post.scheduled_at);
  const wasEdited = post.info_updated || post.original_scheduled_at != null || post.original_suggested_donation != null;
  const verified = post.profile?.vehicle_profiles?.some((v) => v.insurance_self_certified) ?? false;

  return (
    <View style={[{ marginBottom: 28 }, style]}>
      <Card accent={accent} elevation="lg" interactive onPress={() => router.push(`/ride/${post.id}`)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 }}>
          <Badge tone={isOffer ? 'driver' : 'passenger'} icon={isOffer ? 'car' : 'person'}>
            {isOffer ? t.feed.chipPooling : t.feed.chipRide}
          </Badge>
          {wasEdited && (
            <Badge tone="neutral" icon="edit" size="sm">{t.feed.edited}</Badge>
          )}
        </View>

        <RouteLine origin={post.origin_city} destination={post.destination_city} style={{ marginBottom: 14 }} />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          <Meta icon="event" text={date.toLocaleDateString(t.locale, { weekday: 'short', month: 'short', day: 'numeric' })} />
          <Meta icon="schedule" text={date.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })} />
          {isOffer && post.seats_available ? (
            <Meta icon="seat_recline" text={String(post.seats_available)} />
          ) : null}
        </View>

        <View style={{ height: 1, backgroundColor: theme.cardBorder, marginHorizontal: -18, marginBottom: 14 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <Avatar name={post.profile?.full_name ?? '?'} src={post.profile?.avatar_url} size={34} verified={verified} />
            <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.text, flexShrink: 1 }}>
              {post.profile?.full_name}
            </Text>
          </View>
          {post.suggested_donation != null && (
            <Badge tone="warning">{`$${post.suggested_donation} OBO`}</Badge>
          )}
        </View>
      </Card>

      {/* Views count — outside the Card (which clips with overflow:hidden) so it
          can hang over the top-right corner like the design's notification-style badge.
          Always shown (even at 0) — matches the design, and hiding it at 0 read as
          "not implemented" rather than "no views yet". Fixed height so `top` can
          center the pill exactly on the card's top edge (-half the height). */}
      <View
        style={{
          position: 'absolute',
          top: -13,
          right: 20,
          height: 26,
          minWidth: 26,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          paddingHorizontal: 10,
          borderRadius: radii.pill,
          backgroundColor: theme.badgeWarnBg,
          ...shadows.sm,
        }}
      >
        <Icon name="eye" size={12} color={theme.badgeWarnFg} />
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 12, color: theme.badgeWarnFg }}>
          {formatCount(post.views_count)}
        </Text>
      </View>
    </View>
  );
}
