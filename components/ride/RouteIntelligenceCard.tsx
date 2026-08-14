import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useRouteIntelligence } from '@/hooks/useRouteIntelligence';
import { fonts, radii } from '@/constants/themes';
import { RidePostInsight } from '@/types';
import { formatRelativeTime } from '@/utils/dateFormat';

interface Props {
  postId: string;
  // Gated to donors only (matches the source design's "PRO" badge) — pass
  // the viewer's own isDonor, not the post owner's, so it reads as a perk
  // of the viewer's own membership rather than a property of the post.
  visible: boolean;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Miami-based weather codes → an icon, close enough for a one-line summary
// (see generate-post-insight's own codeToLabel for the fuller text mapping).
function weatherIcon(code: number): 'weather_sun' | 'weather_rain' | 'weather_cloud' {
  if (code === 0 || code === 1) return 'weather_sun';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return 'weather_rain';
  return 'weather_cloud';
}

// Ported from the design system's RouteIntelCard (ui_kits/ridemate-app/PostRide.jsx)
// — same header/badge/alert-row/"AI recommendation" layout, but reading the
// real persisted supabase.ride_post_insights row instead of static demo data.
export function RouteIntelligenceCard({ postId, visible }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const { getInsight } = useRouteIntelligence();
  const [insight, setInsight] = useState<RidePostInsight | null | undefined>(undefined);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getInsight(postId).then((data) => { if (!cancelled) setInsight(data); });
    return () => { cancelled = true; };
  }, [visible, postId, getInsight]);

  // Not a donor, still loading, or no row at all (pre-migration post, never
  // seeded) — nothing to show.
  if (!visible || insight === null) return null;

  // generate-post-insight skips posts with no lat/lng (e.g. hauling with
  // disposal:'driver' — no route to analyze) by pushing next_refresh_at out
  // 24h without ever setting generated_at. A next_refresh_at more than an
  // hour out with no generation yet means "already decided there's nothing
  // to show" rather than "still processing" — render nothing either way.
  if (insight && !insight.generated_at) {
    const dueInMs = new Date(insight.next_refresh_at).getTime() - Date.now();
    if (dueInMs > 60 * 60 * 1000) return null;
  }

  const analyzing = insight === undefined || !insight.insight_text;
  const delayMinutes =
    insight?.traffic_duration_seconds != null && insight?.baseline_duration_seconds != null
      ? Math.round((insight.traffic_duration_seconds - insight.baseline_duration_seconds) / 60)
      : null;

  return (
    <View style={{ borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.borderGold }}>
      <View style={{ backgroundColor: '#1C1410', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(201,162,78,0.18)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="brain" size={17} color={theme.gold300} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: theme.gold400 }}>
            {t.post.routeIntelTitle}
          </Text>
          <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: 'rgba(244,236,221,0.72)' }}>
            {t.post.routeIntelSubtitle}
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: theme.surface, padding: 14, gap: 12 }}>
        {analyzing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
            <Icon name="schedule" size={18} color={theme.gold400} />
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.muted }}>{t.post.routeIntelAnalyzing}</Text>
          </View>
        ) : (
          <>
            {insight!.baseline_duration_seconds != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="schedule" size={15} color={theme.textFaint} />
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: theme.muted }}>{t.post.routeIntelEta}:</Text>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.text }}>
                  {formatDuration(insight!.traffic_duration_seconds ?? insight!.baseline_duration_seconds!)}
                </Text>
              </View>
            )}

            {delayMinutes != null && delayMinutes > 2 && (
              <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: theme.surfaceAlt, borderLeftWidth: 3, borderLeftColor: theme.accent }}>
                <Icon name="truck" size={15} color={theme.accent} />
                <Text style={{ flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.textSecondary, lineHeight: 19 }}>
                  {t.post.routeIntelDelayPrefix} {delayMinutes} {t.post.routeIntelDelaySuffix}
                </Text>
              </View>
            )}

            {insight!.weather_temp_f != null && insight!.weather_code != null && (
              <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: theme.surfaceAlt, borderLeftWidth: 3, borderLeftColor: theme.secondary }}>
                <Icon name={weatherIcon(insight!.weather_code)} size={15} color={theme.secondary} />
                <Text style={{ flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.textSecondary, lineHeight: 19 }}>
                  {Math.round(insight!.weather_temp_f)}°F
                </Text>
              </View>
            )}

            {insight!.road_construction.slice(0, 2).map((c, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: theme.surfaceAlt, borderLeftWidth: 3, borderLeftColor: theme.danger }}>
                <Icon name="construction" size={15} color={theme.danger} />
                <Text style={{ flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.textSecondary, lineHeight: 19 }}>
                  {c.description}{c.county ? ` (${c.county} County)` : ''}
                </Text>
              </View>
            ))}

            {insight!.nearby_events.slice(0, 3).map((ev, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: theme.surfaceAlt, borderLeftWidth: 3, borderLeftColor: theme.accent }}>
                <Icon name="ticket" size={15} color={theme.accent} />
                <Text style={{ flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.textSecondary, lineHeight: 19 }}>
                  {ev.name}{ev.venue_name ? ` @ ${ev.venue_name}` : ''}
                </Text>
              </View>
            ))}

            {insight!.insight_text && (
              <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, paddingTop: 12, flexDirection: 'row', gap: 8 }}>
                <Icon name="brain" size={14} color={theme.gold400} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: theme.gold400, marginBottom: 4 }}>
                    {t.post.routeIntelRecommendation}
                  </Text>
                  <Text style={{ fontFamily: fonts.bodyItalic, fontStyle: 'italic', fontSize: 13, color: theme.textSecondary, lineHeight: 20 }}>
                    {insight!.insight_text}
                  </Text>
                </View>
              </View>
            )}

            {insight!.generated_at && (
              <Text style={{ fontSize: 10.5, color: theme.textFaint, textAlign: 'right' }}>
                {t.post.routeIntelUpdated} · {formatRelativeTime(insight!.generated_at, t.locale, {
                  justNow: t.notificationsScreen.justNow,
                  minAgo: t.notificationsScreen.minAgo,
                  hAgo: t.notificationsScreen.hAgo,
                  yesterday: t.notificationsScreen.yesterday,
                  dAgo: t.notificationsScreen.dAgo,
                })}
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}
