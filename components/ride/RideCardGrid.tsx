import { useState } from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { PriceAnalysisSheet } from './PriceAnalysisSheet';
import { ExtrasSheet } from './ExtrasSheet';
import { RidePost, RidePostDetailsRide } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts, radii, shadows } from '@/constants/themes';
import { IconName } from '@/constants/icons';
import { ACCESSIBILITY_OPTIONS } from '@/constants/accessibilityOptions';
import { buildPriceAnalysis, PriceAnalysis } from '@/utils/priceAnalysis';
import { buildExtrasGroups } from '@/utils/postExtras';

interface Props {
  post: RidePost;
  style?: StyleProp<ViewStyle>;
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  return `${Math.floor(n / 1000)}K`;
}

// Compact 2-column grid card — a genuinely different layout from RideCard
// (list mode), not the same card squeezed into a narrower column. That
// approach (the original implementation) broke down at grid width: the kind
// badge collided with the price badge, the price badge overlapped the
// avatar, RouteLine's destination text had no room and rendered as a bare
// colored dot, and rows of uneven height bled into the next row. Matches
// the design system's Feed.jsx grid-card branch: a top accent bar (not a
// left stripe — no room for one), origin/destination stacked with a small
// arrow between instead of RouteLine's horizontal layout, one compact
// date/time line, and the price badge alone in the footer (no avatar/name
// row — there isn't width for it).
export function RideCardGrid({ post, style }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const isOffer = post.type === 'offer';
  const date = new Date(post.scheduled_at);
  const [priceAnalysis, setPriceAnalysis] = useState<PriceAnalysis | null>(null);
  const [extrasOpen, setExtrasOpen] = useState(false);

  type Tone = 'driver' | 'passenger' | 'courier' | 'hauling';
  const kindConfig: Record<RidePost['kind'], { accent: string; tone: Tone; icon: IconName; label: string; pathname: '/ride/[id]' | '/package/[id]' | '/hauling/[id]' }> = {
    ride: { accent: isOffer ? theme.offer : theme.request, tone: isOffer ? 'driver' : 'passenger', icon: isOffer ? 'car' : 'person', label: isOffer ? t.feed.chipPooling : t.feed.chipRide, pathname: '/ride/[id]' },
    package: { accent: theme.courierText, tone: 'courier', icon: 'package', label: t.post.chooserPackageTitle, pathname: '/package/[id]' },
    hauling: { accent: theme.haulingText, tone: 'hauling', icon: 'truck', label: t.post.chooserHaulingTitle, pathname: '/hauling/[id]' },
  };
  const config = kindConfig[post.kind];
  const accessibilityNeeds = post.kind === 'ride' ? (post.details as RidePostDetailsRide)?.accessibilityNeeds ?? [] : [];
  const hasAccess = ACCESSIBILITY_OPTIONS.some((o) => accessibilityNeeds.includes(o.id));
  const isFromAirport = post.airport_leg !== 'to';
  const rideDetails = post.kind === 'ride' ? (post.details as RidePostDetailsRide) : undefined;
  const extrasGroups = buildExtrasGroups(rideDetails, t);
  const hasExtras = extrasGroups.length > 0;

  return (
    <View style={[{ marginBottom: 20 }, style]}>
      <View style={{ position: 'relative' }}>
        <Pressable
          onPress={() => router.push({ pathname: config.pathname, params: { id: post.id } })}
          style={{
            borderRadius: radii.lg, borderWidth: 1, borderColor: theme.cardBorder,
            backgroundColor: theme.surface, overflow: 'hidden', ...shadows.sm,
          }}
        >
          {/* A flat fill bar (no border-radius of its own) placed as the
              first child inside this overflow:hidden, rounded Pressable —
              the PARENT's own clip rounds its corners automatically. Unlike
              the left-stripe technique elsewhere (HistoryCard.tsx etc.),
              this needs no sibling/border trick: that fix was for elements
              with their OWN independent border-radius trying to match the
              parent's curve (and landing short, leaving a sliver). A border
              with only borderTopWidth set has no adjacent colored edge for
              its corner radius to curve into, so it was rendering as a flat
              bar cut off square at the corners instead of following the
              card's rounded edge — this plain filled rectangle avoids that
              entirely. */}
          <View style={{ height: 4, backgroundColor: config.accent }} />
          <View style={{ padding: 12, paddingTop: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {/* Icon-only, no label — matches the icon circle used for the
                  accessibility/airport badges (RideCard.tsx), not the full
                  text Badge — no room for a label at this width. */}
              <View style={{
                width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
                backgroundColor: config.accent + '1F',
              }}>
                <Icon name={config.icon} size={14} color={config.accent} />
              </View>
              {hasAccess && (
                <View style={{
                  width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: theme.borderGold, backgroundColor: theme.gold400 + '24',
                }}>
                  <Icon name="accessible" size={14} color={theme.gold500} />
                </View>
              )}
              {post.airport && (
                <View style={{
                  width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: theme.borderGold, backgroundColor: theme.gold400 + '24',
                }}>
                  <Icon name={isFromAirport ? 'plane_landing' : 'plane_takeoff'} size={13} color={theme.gold500} />
                </View>
              )}
              {hasExtras && (
                <Pressable
                  onPress={() => setExtrasOpen(true)}
                  style={{
                    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, borderColor: theme.borderGold, backgroundColor: theme.gold400 + '24',
                  }}
                >
                  <Icon name="car_front" size={14} color={theme.gold500} />
                </Pressable>
              )}
            </View>

            <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 13.5, color: theme.text }}>
              {post.origin_city}
            </Text>

            <Text numberOfLines={1} style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: theme.textSecondary }}>
              {date.toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })} · {date.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}
            </Text>

            {post.suggested_donation != null && (
              <Pressable
                onPress={() => setPriceAnalysis(buildPriceAnalysis(post.suggested_donation!, post.distance_text))}
                style={{ alignSelf: 'flex-end' }}
              >
                <Badge tone="warning" size="sm">
                  {post.price_mode === 'firm' ? `$${post.suggested_donation}` : `$${post.suggested_donation} · OBO`}
                </Badge>
              </Pressable>
            )}
          </View>
        </Pressable>
      </View>

      {/* Same views-count badge treatment as RideCard (list mode) — outside
          the clipped container so it can hang over the top-right corner. */}
      <View style={{
        position: 'absolute', top: -10, right: 10, height: 22, minWidth: 22,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
        paddingHorizontal: 7, borderRadius: radii.pill, backgroundColor: theme.badgeWarnBg, ...shadows.sm,
      }}>
        <Icon name="eye" size={10} color={theme.badgeWarnFg} />
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10.5, lineHeight: 10.5, color: theme.badgeWarnFg }}>
          {formatCount(post.views_count)}
        </Text>
      </View>

      <PriceAnalysisSheet visible={!!priceAnalysis} analysis={priceAnalysis} onClose={() => setPriceAnalysis(null)} />
      {hasExtras && <ExtrasSheet visible={extrasOpen} onClose={() => setExtrasOpen(false)} groups={extrasGroups} />}
    </View>
  );
}
