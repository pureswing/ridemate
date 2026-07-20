import { useState } from 'react';
import { View, Modal, Pressable, StyleProp, ViewStyle } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { RouteLine } from './RouteLine';
import { RidePost, RidePostDetailsPackage, RidePostDetailsHauling, RidePostDetailsRide } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts, radii, shadows } from '@/constants/themes';
import { leading } from '@/constants/typography';
import { IconName } from '@/constants/icons';
import { ACCESSIBILITY_OPTIONS } from '@/constants/accessibilityOptions';

interface Props {
  post: RidePost;
  style?: StyleProp<ViewStyle>;
}

// 0-999 as-is, 1000+ compact to "1K".."999K".
function formatCount(n: number): string {
  if (n < 1000) return String(n);
  return `${Math.floor(n / 1000)}K`;
}

function Meta({ icon, text }: { icon: IconName; text: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name={icon} size={15} color={theme.muted} />
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: Math.round(14 * leading.snug), color: theme.textSecondary }}>{text}</Text>
    </View>
  );
}

// RideCard — the core feed unit, shared across all three post kinds (ride,
// package, hauling). Kind drives the badge color/icon/route (courier/hauling
// use their own service color per the design system, not the ride-specific
// driver/passenger split) — offer/request still drives the ride-kind badge
// and the accent stripe color for all kinds.
export function RideCard({ post, style }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const isOffer = post.type === 'offer';
  const date = new Date(post.scheduled_at);
  const verified = post.profile?.vehicle_profiles?.some((v) => v.insurance_self_certified) ?? false;
  const [accessOpen, setAccessOpen] = useState(false);
  const [airportOpen, setAirportOpen] = useState(false);

  const accessibilityNeeds = post.kind === 'ride' ? (post.details as RidePostDetailsRide)?.accessibilityNeeds ?? [] : [];
  const accessOptions = ACCESSIBILITY_OPTIONS.filter((o) => accessibilityNeeds.includes(o.id));
  const hasAccess = accessOptions.length > 0;
  const isFromAirport = post.airport_leg !== 'to';

  // Object-form pathname (not a template literal push) — expo-router's typed
  // routes only carries loose UnknownInputParams for a brand-new dynamic
  // route's static `[id]` form right after it's added, not yet the
  // `` `/kind/${id}` `` template pattern (that lags a full route re-scan).
  type Tone = 'driver' | 'passenger' | 'courier' | 'hauling';
  const kindConfig: Record<RidePost['kind'], { accent: string; tone: Tone; icon: IconName; label: string; pathname: '/ride/[id]' | '/package/[id]' | '/hauling/[id]' }> = {
    ride: { accent: isOffer ? theme.offer : theme.request, tone: isOffer ? 'driver' : 'passenger', icon: isOffer ? 'car' : 'person', label: isOffer ? t.feed.chipPooling : t.feed.chipRide, pathname: '/ride/[id]' },
    package: { accent: theme.courierText, tone: 'courier', icon: 'package', label: t.post.chooserPackageTitle, pathname: '/package/[id]' },
    hauling: { accent: theme.haulingText, tone: 'hauling', icon: 'truck', label: t.post.chooserHaulingTitle, pathname: '/hauling/[id]' },
  };
  const config = kindConfig[post.kind];

  const thirdMeta = post.kind === 'ride' && isOffer && post.seats_available
    ? { icon: 'passenger' as IconName, text: String(post.seats_available) }
    : post.kind === 'ride' && !isOffer
      ? { icon: 'passenger' as IconName, text: String((post.details as RidePostDetailsRide)?.adults ?? 1) }
      : post.kind === 'package'
        ? { icon: 'package' as IconName, text: `×${(post.details as RidePostDetailsPackage)?.qty ?? 1}` }
        : post.kind === 'hauling' && (post.details as RidePostDetailsHauling)?.loadSize
          ? { icon: 'truck' as IconName, text: (post.details as RidePostDetailsHauling).loadSize! }
          : null;

  return (
    <View style={[{ marginBottom: 28 }, style]}>
      <Card accent={config.accent} elevation="lg" interactive onPress={() => router.push({ pathname: config.pathname, params: { id: post.id } })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 }}>
          <Badge tone={config.tone} icon={config.icon} iconSize={13}>{config.label}</Badge>
          {/* Plain RN Pressable, not the shared gesture-handler TouchableOpacity —
              it needs to nest under Card's own RN Pressable (see Card.tsx's
              comment: nested RN Pressables correctly claim the touch first and
              stop it from falling through to the card's onPress; a gesture-handler
              Pressable inside a core-RN one doesn't reliably exclude like that). */}
          {hasAccess && (
            <Pressable
              onPress={() => setAccessOpen(true)}
              style={{
                width: 28, height: 28, borderRadius: 14,
                borderWidth: 1, borderColor: theme.borderGold,
                backgroundColor: theme.gold400 + '24',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="accessible" size={15} color={theme.gold500} />
            </Pressable>
          )}
          {post.airport && (
            <Pressable
              onPress={() => setAirportOpen(true)}
              style={{
                width: 28, height: 28, borderRadius: 14,
                borderWidth: 1, borderColor: theme.borderGold,
                backgroundColor: theme.gold400 + '24',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name={isFromAirport ? 'plane_landing' : 'plane_takeoff'} size={14} color={theme.gold500} />
            </Pressable>
          )}
        </View>

        <RouteLine origin={post.origin_city} destination={post.destination_city} style={{ marginBottom: 14 }} />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          <Meta icon="event" text={date.toLocaleDateString(t.locale, { weekday: 'short', month: 'short', day: 'numeric' })} />
          <Meta icon="schedule" text={date.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })} />
          {thirdMeta && <Meta icon={thirdMeta.icon} text={thirdMeta.text} />}
        </View>

        <View style={{ height: 1, backgroundColor: theme.cardBorder, marginHorizontal: -18, marginBottom: 14 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {/* Plain RN Pressable, not the shared gesture-handler TouchableOpacity —
              same reasoning as the accessibility/airport buttons above: it needs
              to claim the tap before it falls through to the Card's own onPress. */}
          <Pressable
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: post.user_id } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}
          >
            <Avatar name={post.profile?.full_name ?? '?'} src={post.profile?.avatar_url} size={34} verified={verified} />
            <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.text, flexShrink: 1 }}>
              {post.profile?.full_name}
            </Text>
          </Pressable>
          {post.suggested_donation != null && (
            <Badge tone="warning" fontSize={14} style={{ paddingHorizontal: 14, paddingVertical: 7 }}>
              {post.price_mode === 'firm' ? `$${post.suggested_donation}` : `$${post.suggested_donation} · OBO`}
            </Badge>
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

      {hasAccess && (
        <Modal visible={accessOpen} transparent animationType="slide" onRequestClose={() => setAccessOpen(false)}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setAccessOpen(false)}>
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View style={{
                  position: 'relative',
                  backgroundColor: theme.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
                  padding: 20, paddingBottom: insets.bottom + 20, maxHeight: '72%',
                }}>
                  {/* Fills any gap below the safe-area padding on devices where
                      useSafeAreaInsets() under-reports inside a Modal's own
                      native root (gesture-nav Android in particular) — solid
                      color bleeding past the screen edge costs nothing, an
                      unpainted strip of backdrop showing through does. */}
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: -40, height: 40, backgroundColor: theme.surface }} />
                  <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 16 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.gold400 + '24', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="accessible" size={18} color={theme.gold500} />
                    </View>
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: theme.text }}>{t.feed.accessibilityRequirements}</Text>
                  </View>
                  <View style={{ gap: 10 }}>
                    {accessOptions.map((opt) => (
                      <View key={opt.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radii.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceAlt }}>
                        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name={opt.icon} size={17} color={theme.text} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontFamily: fonts.displayBold, fontSize: 14.5, color: theme.text }}>{opt.label}</Text>
                          <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.muted, marginTop: 2, lineHeight: 17 }}>{opt.desc}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </GestureHandlerRootView>
        </Modal>
      )}

      {post.airport && (
        <Modal visible={airportOpen} transparent animationType="slide" onRequestClose={() => setAirportOpen(false)}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setAirportOpen(false)}>
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View style={{
                  position: 'relative',
                  backgroundColor: theme.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
                  padding: 20, paddingBottom: insets.bottom + 20,
                }}>
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: -40, height: 40, backgroundColor: theme.surface }} />
                  <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 16 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.gold400 + '24', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={isFromAirport ? 'plane_landing' : 'plane_takeoff'} size={17} color={theme.gold500} />
                    </View>
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: theme.text }}>
                      {isFromAirport ? t.feed.airportPickup : t.feed.airportDropoff}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radii.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceAlt }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={isFromAirport ? 'plane_landing' : 'plane_takeoff'} size={17} color={theme.text} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontFamily: fonts.displayBold, fontSize: 14.5, color: theme.text }}>
                        {isFromAirport ? t.feed.pickingUpFromAirport : t.feed.droppingAtAirport}
                      </Text>
                      <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.muted, marginTop: 2, lineHeight: 17 }}>
                        {post.flight_number ? `${t.feed.flightLabel} ${post.flight_number} — ${t.feed.arrivalTracked}` : t.feed.airportLegNote}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </GestureHandlerRootView>
        </Modal>
      )}
    </View>
  );
}
