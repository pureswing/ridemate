import { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, Animated, LayoutChangeEvent } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { BadgeGlyph } from '@/components/community/BadgeGlyph';
import { BadgeInfoSheet } from '@/components/community/BadgeInfoSheet';
import { RowDivider } from '@/components/ui/RowDivider';
import { RpmTrendChart } from '@/components/profile/RpmTrendChart';
import { BADGE_ICONS } from '@/constants/badgeIcons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSubscription } from '@/hooks/useSubscription';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { IconName } from '@/constants/icons';
import { BadgeType } from '@/types';

// Ported from ui_kits/ridemate-app/Dashboard.jsx — PURELY VISUAL. Every
// number on this screen is a local fixture, not a real query (no
// Supabase/hooks calls at all). The design source computes these from
// window.RM_* globals (ride history, bid stats, cancellation stats,
// community rank, etc.) that don't exist as real backend concepts in this
// app yet — this screen exists to preview the visual design, not to report
// real activity. Wire it to real data later once those concepts exist.
// The design's numeric 5-star "Avg rating" stat was dropped — this app has
// no star-rating concept anywhere (badges only, a deliberate TNC-compliance
// choice), so it's swapped for a total-badges count instead.
const BID_HISTORY = [true, true, false, true, true, true, false, true]; // won/lost, oldest→newest
const BID_WIN_RATE = Math.round((BID_HISTORY.filter(Boolean).length / BID_HISTORY.length) * 100);

// Notice given before a cancellation is what the tone/suggestion/flag logic
// is built on — not raw counts. Matches the design's byUser/onUser split:
// "by you" drives your tone and flags, "on you" is just shown for context.
const CANCELLATION = {
  byUserCount: 2, byUserAvgNotice: 5.2,
  onUserCount: 1, onUserAvgNotice: 3.8,
  communityAvgNotice: 4.0,
  flags: 1, flagThreshold: 5,
};
const CANCEL_TONE: 'none' | 'healthy' | 'mid' | 'risky' =
  CANCELLATION.byUserCount === 0 ? 'none'
    : CANCELLATION.byUserAvgNotice >= 4 ? 'healthy'
    : CANCELLATION.byUserAvgNotice >= 2 ? 'mid'
    : 'risky';

// Real BadgeType keys — the glyphs render via the same BadgeGlyph shield
// used in the completion-review flow and Profile's Community badges row,
// not a hand-rolled icon box.
const BADGES: { type: BadgeType; count: number }[] = [
  { type: 'clean_car', count: 12 },
  { type: 'punctual', count: 9 },
  { type: 'friendly', count: 15 },
  { type: 'great_chat', count: 6 },
];

const RANK_TIERS = ['New', 'Active', 'Trusted', 'Elite'];
const CURRENT_TIER = 2; // index into RANK_TIERS — "Trusted"

const FEEDBACK_TOTAL = 18;
const FEEDBACK_STRENGTHS = ['Punctual', 'Clean car', 'Friendly'];
const FEEDBACK_WATCHOUTS = ['Slow to reply'];

const MILESTONES: { icon: IconName; label: string; progress: number; goal: string }[] = [
  { icon: 'route', label: '50 rides completed', progress: 0.76, goal: '38 / 50' },
  { icon: 'event', label: '6 months on RideMate', progress: 0.5, goal: '3 / 6 mo' },
  { icon: 'star', label: '10 badges earned', progress: 0.8, goal: '8 / 10' },
  { icon: 'shield_check', label: 'Zero no-shows streak', progress: 1, goal: '12 / 12' },
];

const TRIPS_AS_DRIVER = { total: 38, rides: 24, courier: 9, hauling: 5 };
const TIME_ON_ROAD = { total: '26h 40m', rides: '16h 0m', courier: '6h 0m', hauling: '4h 40m' };

const EARNINGS = [
  { label: 'Rides', amount: 340, color: '#0A7E77' },
  { label: 'Courier', amount: 128, color: '#08637A' },
  { label: 'Hauling', amount: 96, color: '#9E4A14' },
];
const EARNINGS_TOTAL = EARNINGS.reduce((s, e) => s + e.amount, 0);
const TOTAL_SPENT = 212;

const MILES_DRIVEN = { total: 1520, rides: 960, courier: 360, hauling: 200 };

const MONTHLY_ACTIVITY = [
  { m: 'Feb', driver: 0, passenger: 0 },
  { m: 'Mar', driver: 1, passenger: 0 },
  { m: 'Apr', driver: 2, passenger: 1 },
  { m: 'May', driver: 3, passenger: 2 },
  { m: 'Jun', driver: 5, passenger: 3 },
  { m: 'Jul', driver: 6, passenger: 3 },
];
const MONTHLY_MAX = 8;

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_COUNT = [1, 4, 6, 3, 7, 5, 2];
const DOW_MAX = Math.max(...DOW_COUNT);

const TOP_ROUTES = [
  { origin: 'Winter Haven', destination: 'Orlando', count: 6 },
  { origin: 'Orlando', destination: 'Tampa', count: 4 },
  { origin: 'Winter Haven', destination: 'Lakeland', count: 3 },
];
const ROUTES_COMPLETED_TOTAL = 38;

const EXPENSES: { label: string; icon: IconName; color: string; fare: number; fuel?: number; wear?: number }[] = [
  { label: 'Ride', icon: 'car', color: '#ED4A2B', fare: 180, fuel: 36, wear: 138 },
  { label: 'Courier', icon: 'package', color: '#0EA5C4', fare: 64, fuel: 14, wear: 52 },
  { label: 'Hauling', icon: 'truck', color: '#E07B39', fare: 40, fuel: 9, wear: 35 },
];

const FUN_FACTS: { icon: IconName; label: string; stat: string; route: string; date: string }[] = [
  { icon: 'route', label: 'Your longest trip', stat: '62 mi', route: 'Winter Haven → Miami', date: 'Jun 14' },
  { icon: 'money', label: 'Your best paid trip', stat: '$85', route: 'Winter Haven → Orlando', date: 'Jul 2' },
  { icon: 'schedule', label: 'Your longest ride', stat: '95 min', route: 'Winter Haven → Jacksonville', date: 'May 22' },
];

type SectionKey = 'overview' | 'community' | 'activity' | 'finance' | 'funfacts';
const SECTION_ICONS: Record<SectionKey, IconName> = {
  overview: 'summary', community: 'users_round', activity: 'activity', finance: 'coins', funfacts: 'lightbulb',
};
const SECTIONS: SectionKey[] = ['overview', 'community', 'activity', 'finance', 'funfacts'];
const PAID_SECTIONS: SectionKey[] = ['activity', 'finance', 'funfacts'];

// Small circular "i" button — tapping it opens DashboardScreen's info sheet
// with an explanation of that card's metric. Matches the design's per-card
// info affordance.
function InfoButton({ onPress, theme }: { onPress: () => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 28, height: 28, borderRadius: 14, backgroundColor: theme.surfaceAlt,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8,
      }}
    >
      <Icon name="info" size={14} color={theme.textFaint} />
    </Pressable>
  );
}

function SectionCard({ title, subtitle, children, theme, accent, onInfo }: { title?: string; subtitle?: string; children: React.ReactNode; theme: ReturnType<typeof useTheme>; accent?: string; onInfo?: () => void }) {
  return (
    <View style={{
      backgroundColor: theme.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.cardBorder,
      overflow: 'hidden', ...shadows.sm,
    }}>
      {accent && <View style={{ height: 4, backgroundColor: accent }} />}
      <View style={{ padding: 18 }}>
        {title && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 15.5, color: theme.text }}>{title}</Text>
              {subtitle && <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.muted, marginTop: 2 }}>{subtitle}</Text>}
            </View>
            {onInfo && <InfoButton onPress={onInfo} theme={theme} />}
          </View>
        )}
        <View style={{ marginTop: title ? 14 : 0 }}>{children}</View>
      </View>
    </View>
  );
}

function SectionHeading({ children, theme }: { children: React.ReactNode; theme: ReturnType<typeof useTheme> }) {
  return <Text style={{ fontFamily: fonts.displayBold, fontSize: 16.5, color: theme.text, marginBottom: 10 }}>{children}</Text>;
}

// Animated icon-segmented pill — a sliding highlight tracks whichever
// section is active, matching the app's other segmented-control patterns
// but icon-only (no labels) to stay compact across 5 sections.
function SectionPill({ active, onChange, theme }: { active: SectionKey; onChange: (k: SectionKey) => void; theme: ReturnType<typeof useTheme> }) {
  const [width, setWidth] = useState(0);
  const indicator = useRef(new Animated.Value(0)).current;
  const idx = SECTIONS.indexOf(active);

  useEffect(() => {
    Animated.spring(indicator, { toValue: idx, useNativeDriver: true, friction: 9, tension: 80 }).start();
  }, [idx, indicator]);

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  // width is the container's own border box (padding included); the 5
  // flex:1 icon buttons actually split (width - padding*2) between them, so
  // the indicator has to use that same inner width or it drifts away from
  // the real button centers — most visibly at the first/last segments.
  const innerWidth = Math.max(width - 8, 0);
  const segW = innerWidth / SECTIONS.length;
  const translateX = indicator.interpolate({
    inputRange: SECTIONS.map((_, i) => i),
    outputRange: SECTIONS.map((_, i) => i * segW),
  });

  return (
    <View onLayout={onLayout} style={{ flexDirection: 'row', backgroundColor: theme.surfaceAlt, borderRadius: radii.pill, padding: 4 }}>
      {width > 0 && (
        <Animated.View style={{
          position: 'absolute', top: 4, bottom: 4, left: 4, width: segW,
          borderRadius: radii.pill, backgroundColor: theme.surface, transform: [{ translateX }], ...shadows.sm,
        }} />
      )}
      {SECTIONS.map((key) => (
        <Pressable key={key} onPress={() => onChange(key)} style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={SECTION_ICONS[key]} size={20} color={active === key ? theme.gold500 : theme.textFaint} />
        </Pressable>
      ))}
    </View>
  );
}

// Where the user's average cancellation notice sits on a risky→fair
// spectrum, with a marker for the community average alongside it —
// deliberately a compact linear gauge rather than a bar chart of raw counts.
function NoticeGauge({ yourHours, communityHours, toneColor, caption, theme, t }: {
  yourHours: number; communityHours: number; toneColor: string; caption: string | null;
  theme: ReturnType<typeof useTheme>; t: ReturnType<typeof useTranslation>;
}) {
  const MAX = 6; // hours; anything at/above reads as "fair"
  const yourPct = Math.max(2, Math.min(98, (yourHours / MAX) * 100));
  const commPct = Math.max(2, Math.min(98, (communityHours / MAX) * 100));

  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: letterSpacingFor(10.5, tracking.wide), color: theme.textFaint, marginBottom: 10 }}>
        {t.dashboard.cancelGaugeTitle}
      </Text>
      <LinearGradient
        colors={[theme.danger, theme.gold400, theme.driverText]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ height: 8, borderRadius: 99 }}
      >
        <View style={{ position: 'absolute', left: `${commPct}%`, top: '50%', marginTop: -5, marginLeft: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: theme.surface, borderWidth: 2, borderColor: theme.textFaint }} />
        <View style={{ position: 'absolute', left: `${yourPct}%`, top: '50%', marginTop: -7.5, marginLeft: -7.5, width: 15, height: 15, borderRadius: 7.5, backgroundColor: toneColor, borderWidth: 2.5, borderColor: theme.surface, ...shadows.xs }} />
      </LinearGradient>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, color: theme.danger }}>{t.dashboard.cancelRisky}</Text>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, color: theme.driverText }}>{t.dashboard.cancelFairNotice}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: toneColor, borderWidth: 2, borderColor: theme.surface, ...shadows.xs }} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11.5, color: theme.text }}>{t.dashboard.cancelYouPrefix} {yourHours.toFixed(1)}h</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: theme.surface, borderWidth: 2, borderColor: theme.textFaint }} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11.5, color: theme.muted }}>{t.dashboard.cancelCommunityPrefix} {communityHours.toFixed(1)}h</Text>
        </View>
      </View>
      {caption && <Text style={{ marginTop: 8, fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.muted, lineHeight: 18 }}>{caption}</Text>}
    </View>
  );
}

function KpiCard({ icon, label, value, accent, sub, theme, onInfo }: {
  icon: IconName; label: string; value: string; accent: string;
  sub?: { icon: IconName; label: string; value: string; color: string }[];
  theme: ReturnType<typeof useTheme>;
  onInfo?: () => void;
}) {
  return (
    <View style={{ backgroundColor: theme.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.cardBorder, padding: 16, ...shadows.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: accent + '26', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={15} color={accent} />
        </View>
        <Text style={{ flex: 1, fontFamily: fonts.bodySemibold, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11.5, tracking.wide), color: theme.muted }}>{label}</Text>
        {onInfo && <InfoButton onPress={onInfo} theme={theme} />}
      </View>
      <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: 24, color: theme.text, letterSpacing: -0.3 }}>{value}</Text>
      {sub && sub.length > 0 && (
        <View style={{ flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.cardBorder, justifyContent: 'space-around' }}>
          {sub.map((s) => (
            <View key={s.label} style={{ alignItems: 'center', gap: 4, maxWidth: 80 }}>
              <Icon name={s.icon} size={20} color={s.color} />
              <Text numberOfLines={1} style={{ fontFamily: fonts.bodyRegular, fontSize: 10, color: theme.textFaint, textAlign: 'center' }}>{s.label}</Text>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: s.color }}>{s.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function LockedSection({ theme, t }: { theme: ReturnType<typeof useTheme>; t: ReturnType<typeof useTranslation> }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
      <View style={{
        width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.gold400, ...shadows.gold,
      }}>
        <Icon name="lock" size={26} color={theme.textOnPrimary} />
      </View>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: theme.text, marginTop: 14, textAlign: 'center' }}>
        {t.dashboard.lockedTitle}
      </Text>
      <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: theme.muted, marginTop: 6, textAlign: 'center', maxWidth: 260 }}>
        {t.dashboard.lockedSub}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDonor } = useSubscription();
  const [infoText, setInfoText] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [selectedBadge, setSelectedBadge] = useState<{ type: BadgeType; count: number } | null>(null);

  const cancelToneColor = CANCEL_TONE === 'mid' ? theme.gold400 : CANCEL_TONE === 'risky' ? theme.danger : theme.driverText;
  const cancelHeadline = {
    none: t.dashboard.cancelHeadlineNone, healthy: t.dashboard.cancelHeadlineHealthy,
    mid: t.dashboard.cancelHeadlineMid, risky: t.dashboard.cancelHeadlineRisky,
  }[CANCEL_TONE];
  const cancelSuggestion = {
    none: t.dashboard.cancelSuggestionNone,
    healthy: t.dashboard.cancelSuggestionHealthy.replace('{h}', CANCELLATION.byUserAvgNotice.toFixed(1)),
    mid: t.dashboard.cancelSuggestionMid.replace('{h}', CANCELLATION.byUserAvgNotice.toFixed(1)),
    risky: t.dashboard.cancelSuggestionRisky,
  }[CANCEL_TONE];
  const cancelVsCommunity = CANCELLATION.byUserCount > 0 && CANCELLATION.communityAvgNotice > 0
    ? (CANCELLATION.byUserAvgNotice >= CANCELLATION.communityAvgNotice ? t.dashboard.cancelVsCommunityAbove : t.dashboard.cancelVsCommunityBelow)
    : null;

  const sectionTitle: Record<SectionKey, string> = {
    overview: t.dashboard.overviewTitle,
    community: t.dashboard.communityTitle,
    activity: t.dashboard.activityTitle,
    finance: t.dashboard.financeTitle,
    funfacts: t.dashboard.funFactsTitle,
  };

  const locked = PAID_SECTIONS.includes(activeSection) && !isDonor;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg, zIndex: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          <View style={{ width: 44 }} />
        </View>
        <View style={{ paddingHorizontal: 22, paddingTop: 10 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: letterSpacingFor(26, tracking.tight), color: theme.cream }}>
            {t.dashboard.title}
          </Text>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
            {t.dashboard.subtitle}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 40 }}>
        <View style={{ flexDirection: 'row', gap: 10, backgroundColor: theme.gold400 + '18', borderWidth: 1, borderColor: theme.borderGold, borderRadius: radii.md, padding: 12 }}>
          <View style={{ marginTop: 1 }}>
            <Icon name="info" size={16} color={theme.gold500} />
          </View>
          <Text style={{ flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.muted, lineHeight: 17 }}>
            {t.dashboard.mockNotice}
          </Text>
        </View>

        <SectionPill active={activeSection} onChange={setActiveSection} theme={theme} />

        <View>
          <SectionHeading theme={theme}>{sectionTitle[activeSection]}</SectionHeading>

          {locked ? (
            <LockedSection theme={theme} t={t} />
          ) : activeSection === 'overview' ? (
            <View style={{ gap: 12 }}>
              <KpiCard theme={theme} icon="car" label={t.dashboard.kpiTripsLabel} value={String(TRIPS_AS_DRIVER.total)} accent={theme.driverText}
                onInfo={() => setInfoText(t.dashboard.infoTrips)}
                sub={[
                  { icon: 'car', label: t.dashboard.kindRides, value: String(TRIPS_AS_DRIVER.rides), color: theme.driverText },
                  { icon: 'package', label: t.dashboard.kindCourier, value: String(TRIPS_AS_DRIVER.courier), color: theme.courierText },
                  { icon: 'truck', label: t.dashboard.kindHauling, value: String(TRIPS_AS_DRIVER.hauling), color: theme.haulingText },
                ]} />
              <KpiCard theme={theme} icon="schedule" label={t.dashboard.kpiTimeLabel} value={TIME_ON_ROAD.total} accent={theme.gold500}
                onInfo={() => setInfoText(t.dashboard.infoTime)}
                sub={[
                  { icon: 'car', label: t.dashboard.kindRides, value: TIME_ON_ROAD.rides, color: theme.driverText },
                  { icon: 'package', label: t.dashboard.kindCourier, value: TIME_ON_ROAD.courier, color: theme.courierText },
                  { icon: 'truck', label: t.dashboard.kindHauling, value: TIME_ON_ROAD.hauling, color: theme.haulingText },
                ]} />
              <KpiCard theme={theme} icon="banknote_arrow_up" label={t.dashboard.kpiEarnedLabel} value={`$${EARNINGS_TOTAL}`} accent={theme.gold500}
                onInfo={() => setInfoText(t.dashboard.infoEarned)}
                sub={EARNINGS.map((e) => ({ icon: (e.label === 'Rides' ? 'car' : e.label === 'Courier' ? 'package' : 'truck') as IconName, label: e.label === 'Rides' ? t.dashboard.kindRides : e.label === 'Courier' ? t.dashboard.kindCourier : t.dashboard.kindHauling, value: `$${e.amount}`, color: e.color }))} />
              <KpiCard theme={theme} icon="banknote_arrow_down" label={t.dashboard.kpiSpentLabel} value={`$${TOTAL_SPENT}`} accent={theme.muted}
                onInfo={() => setInfoText(t.dashboard.infoSpent)} />
            </View>
          ) : activeSection === 'community' ? (
            <View style={{ gap: 12 }}>
              <SectionCard theme={theme} title={t.dashboard.badgesTitle} onInfo={() => setInfoText(t.dashboard.infoBadges)}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                  {BADGES.map((b) => (
                    <View key={b.type} style={{ alignItems: 'center', gap: 5, width: 56 }}>
                      <Pressable onPress={() => setSelectedBadge(b)}>
                        <BadgeGlyph badge={b.type} size={48} color={BADGE_ICONS[b.type].color} />
                      </Pressable>
                      <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: theme.text }}>{b.count}×</Text>
                    </View>
                  ))}
                </View>
              </SectionCard>

              <SectionCard theme={theme} title={t.dashboard.rankTitle} subtitle={t.dashboard.rankSub} onInfo={() => setInfoText(t.dashboard.infoRank)}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {RANK_TIERS.map((tier, i) => (
                    <View key={tier} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                      <View style={{ width: '100%', height: 6, borderRadius: 3, backgroundColor: i <= CURRENT_TIER ? theme.gold500 : theme.surfaceAlt }} />
                      <Text style={{ fontFamily: i === CURRENT_TIER ? fonts.bodyExtraBold : fonts.bodyMedium, fontSize: 10.5, color: i === CURRENT_TIER ? theme.gold500 : theme.textFaint }}>{tier}</Text>
                    </View>
                  ))}
                </View>
              </SectionCard>

              <SectionCard theme={theme} title={t.dashboard.feedbackTitle} onInfo={() => setInfoText(t.dashboard.infoFeedback)}>
                <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: 22, color: theme.text, marginBottom: 10 }}>{FEEDBACK_TOTAL} <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: theme.textFaint }}>{t.dashboard.feedbackTotalSuffix}</Text></Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Icon name="brain" size={15} color={theme.gold400} />
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.textFaint }}>{t.dashboard.feedbackAiLabel}</Text>
                </View>
                {!isDonor ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surfaceAlt, borderRadius: radii.md, padding: 12 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.gold400 }}>
                      <Icon name="lock" size={16} color={theme.textOnPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: theme.text }}>{t.dashboard.feedbackLockedTitle}</Text>
                      <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint, marginTop: 1 }}>{t.dashboard.feedbackLockedSub}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ backgroundColor: theme.surfaceAlt, borderRadius: radii.md, padding: 12, borderLeftWidth: 3, borderLeftColor: theme.gold400 }}>
                    <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12.5, fontStyle: 'italic', color: theme.text, lineHeight: 18, marginBottom: 9 }}>
                      "{t.dashboard.feedbackAiSummary}"
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {FEEDBACK_STRENGTHS.map((s) => (
                        <View key={s} style={{ backgroundColor: theme.driverText + '18', paddingHorizontal: 9, paddingVertical: 3, borderRadius: radii.pill }}>
                          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: theme.driverText }}>{s}</Text>
                        </View>
                      ))}
                      {FEEDBACK_WATCHOUTS.map((w) => (
                        <View key={w} style={{ backgroundColor: theme.gold400 + '20', paddingHorizontal: 9, paddingVertical: 3, borderRadius: radii.pill }}>
                          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: theme.gold500 }}>{w}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </SectionCard>

              <SectionCard theme={theme} title={t.dashboard.cancelTitle} onInfo={() => setInfoText(t.dashboard.infoCancel)}>
                <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: 17, color: cancelToneColor, marginBottom: 12 }}>{cancelHeadline}</Text>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radii.md, backgroundColor: theme.surfaceAlt }}>
                    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: cancelToneColor + '1F', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="close" size={15} color={cancelToneColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: theme.text }}>{t.dashboard.cancelByYou}</Text>
                      <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint, marginTop: 1 }}>
                        {CANCELLATION.byUserCount} {CANCELLATION.byUserCount === 1 ? t.dashboard.cancelJob : t.dashboard.cancelJobs}
                        {CANCELLATION.byUserCount > 0 ? ` · ${t.dashboard.cancelAvgPrefix} ${CANCELLATION.byUserAvgNotice.toFixed(1)}h ${t.dashboard.cancelNoticeSuffix}` : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radii.md, backgroundColor: theme.surfaceAlt }}>
                    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="person" size={15} color={theme.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: theme.text }}>{t.dashboard.cancelOnYou}</Text>
                      <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint, marginTop: 1 }}>
                        {CANCELLATION.onUserCount} {CANCELLATION.onUserCount === 1 ? t.dashboard.cancelJob : t.dashboard.cancelJobs}
                        {CANCELLATION.onUserCount > 0 ? ` · ${t.dashboard.cancelAvgPrefix} ${CANCELLATION.onUserAvgNotice.toFixed(1)}h ${t.dashboard.cancelNoticeFromCreatorsSuffix}` : ''}
                      </Text>
                    </View>
                  </View>
                </View>

                {CANCELLATION.byUserCount > 0 && CANCELLATION.communityAvgNotice > 0 && (
                  <NoticeGauge
                    yourHours={CANCELLATION.byUserAvgNotice}
                    communityHours={CANCELLATION.communityAvgNotice}
                    toneColor={cancelToneColor}
                    caption={cancelVsCommunity}
                    theme={theme} t={t}
                  />
                )}

                <View style={{ marginTop: 10, padding: 12, borderRadius: radii.md, backgroundColor: theme.surfaceAlt, borderLeftWidth: 3, borderLeftColor: cancelToneColor }}>
                  <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12.5, fontStyle: 'italic', color: theme.text, lineHeight: 18 }}>
                    "{cancelSuggestion}"
                  </Text>
                </View>

                {CANCELLATION.flags > 0 && (
                  <View style={{ marginTop: 10, padding: 12, borderRadius: radii.md, backgroundColor: cancelToneColor + '14' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Icon name="report" size={15} color={cancelToneColor} />
                      <Text style={{ flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.text, lineHeight: 17 }}>
                        <Text style={{ fontFamily: fonts.bodyBold, color: cancelToneColor }}>{CANCELLATION.flags} {t.dashboard.cancelFlagsOf} {CANCELLATION.flagThreshold}</Text> {t.dashboard.cancelFlagsSuffix}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 5, marginTop: 9 }}>
                      {Array.from({ length: CANCELLATION.flagThreshold }).map((_, i) => (
                        <View key={i} style={{ flex: 1, height: 6, borderRadius: 99, backgroundColor: i < CANCELLATION.flags ? cancelToneColor : theme.surface }} />
                      ))}
                    </View>
                    <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint, marginTop: 7 }}>
                      {t.dashboard.cancelFlagsReview.replace('{n}', String(CANCELLATION.flagThreshold))}
                    </Text>
                  </View>
                )}
              </SectionCard>

              <SectionCard title={t.dashboard.milestonesTitle} theme={theme}>
                <View style={{ gap: 14 }}>
                  {MILESTONES.map((m) => (
                    <View key={m.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={m.icon} size={17} color={m.progress >= 1 ? theme.driverText : theme.muted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                          <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemibold, fontSize: 12.5, color: theme.text, flexShrink: 1 }}>{m.label}</Text>
                          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: theme.muted }}>{m.goal}</Text>
                        </View>
                        <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.surfaceAlt, overflow: 'hidden' }}>
                          <View style={{ width: `${m.progress * 100}%`, height: '100%', backgroundColor: m.progress >= 1 ? theme.driverText : theme.gold400, borderRadius: 3 }} />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </SectionCard>
            </View>
          ) : activeSection === 'activity' ? (
            <View style={{ gap: 12 }}>
              <KpiCard theme={theme} icon="route" label={t.dashboard.milesTitle} value={`${MILES_DRIVEN.total} mi`} accent={theme.driverText}
                onInfo={() => setInfoText(t.dashboard.infoMiles)}
                sub={[
                  { icon: 'car', label: t.dashboard.kindRides, value: `${MILES_DRIVEN.rides} mi`, color: theme.driverText },
                  { icon: 'package', label: t.dashboard.kindCourier, value: `${MILES_DRIVEN.courier} mi`, color: theme.courierText },
                  { icon: 'truck', label: t.dashboard.kindHauling, value: `${MILES_DRIVEN.hauling} mi`, color: theme.haulingText },
                ]} />

              <SectionCard theme={theme} title={t.dashboard.monthlyTitle}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 90 }}>
                  {MONTHLY_ACTIVITY.map((m) => (
                    <View key={m.m} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 76 }}>
                        <View style={{ width: 9, height: Math.max((m.driver / MONTHLY_MAX) * 76, 3), backgroundColor: theme.driverText, borderRadius: 3 }} />
                        <View style={{ width: 9, height: Math.max((m.passenger / MONTHLY_MAX) * 76, 3), backgroundColor: theme.passengerText, borderRadius: 3, opacity: 0.75 }} />
                      </View>
                      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 10, color: theme.textFaint }}>{m.m}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: theme.driverText }} />
                    <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.muted }}>{t.dashboard.monthlyAsDriver}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: theme.passengerText }} />
                    <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.muted }}>{t.dashboard.monthlyAsRider}</Text>
                  </View>
                </View>
              </SectionCard>

              <SectionCard theme={theme} title={t.dashboard.busiestTitle}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end', height: 60 }}>
                  {DOW_LABELS.map((day, i) => {
                    const h = DOW_COUNT[i];
                    const pct = h / DOW_MAX;
                    const barH = Math.max(10, Math.round(pct * 48));
                    const bg = pct < 0.4 ? theme.gold400 + '46' : pct < 0.75 ? theme.gold400 + '8C' : theme.gold400;
                    return (
                      <View key={day} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                        <View style={{ width: '100%', height: 48, justifyContent: 'flex-end' }}>
                          <View style={{ width: '100%', height: barH, borderRadius: 8, backgroundColor: bg }} />
                        </View>
                        <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 10, color: theme.textFaint }}>{day}</Text>
                      </View>
                    );
                  })}
                </View>
              </SectionCard>

              <SectionCard theme={theme} title={t.dashboard.bidWinTitle} subtitle={t.dashboard.bidWinSub} onInfo={() => setInfoText(t.dashboard.infoBidWin)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 6, borderColor: theme.driverText, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: 16, color: theme.text }}>{BID_WIN_RATE}%</Text>
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 40 }}>
                    {BID_HISTORY.map((won, i) => (
                      <View key={i} style={{ flex: 1, height: won ? 40 : 18, borderRadius: 3, backgroundColor: won ? theme.driverText : theme.surfaceAlt }} />
                    ))}
                  </View>
                </View>
              </SectionCard>

              <SectionCard theme={theme} title={t.dashboard.routesTitle}>
                <View style={{ gap: 12 }}>
                  {TOP_ROUTES.map((r) => {
                    const pct = Math.round((r.count / ROUTES_COMPLETED_TOTAL) * 100);
                    return (
                      <View key={`${r.origin}-${r.destination}`}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 13, color: theme.text }}>{r.origin} → {r.destination}</Text>
                          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11.5, color: theme.muted }}>{r.count}x · {pct}%</Text>
                        </View>
                        <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.surfaceAlt, overflow: 'hidden' }}>
                          <View style={{ width: `${pct}%`, height: '100%', backgroundColor: theme.gold400, borderRadius: 3 }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </SectionCard>
            </View>
          ) : activeSection === 'finance' ? (
            <View style={{ gap: 12 }}>
              <SectionCard theme={theme} title={t.dashboard.earningsTitle} subtitle={t.dashboard.earningsSub}>
                <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: 24, color: theme.text, marginBottom: 12 }}>${EARNINGS_TOTAL}</Text>
                <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
                  {EARNINGS.map((e) => <View key={e.label} style={{ width: `${(e.amount / EARNINGS_TOTAL) * 100}%`, backgroundColor: e.color }} />)}
                </View>
                <View style={{ gap: 8 }}>
                  {EARNINGS.map((e) => (
                    <View key={e.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: e.color }} />
                      <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.text }}>{e.label}</Text>
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: theme.text }}>${e.amount}</Text>
                    </View>
                  ))}
                </View>
              </SectionCard>

              <SectionCard theme={theme} title={t.dashboard.rpmTitle} subtitle={t.dashboard.rpmSub} onInfo={() => setInfoText(t.dashboard.infoRpm)}>
                <RpmTrendChart />
              </SectionCard>

              <SectionCard theme={theme} title={t.dashboard.expensesTitle}>
                <View style={{ gap: 14 }}>
                  {EXPENSES.map((ex, i) => {
                    const total = ex.fare + (ex.fuel ?? 0) + (ex.wear ?? 0);
                    return (
                      <View key={ex.label} style={{ gap: 14 }}>
                        {i > 0 && <RowDivider theme={theme} />}
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                              <Icon name={ex.icon} size={16} color={ex.color} />
                            </View>
                            <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.textFaint }}>{ex.label} {t.dashboard.expenseSuffix}</Text>
                            <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: 16, color: ex.color }}>${total}</Text>
                          </View>
                          <View style={{ gap: 6 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.muted }}>{t.dashboard.expenseFare}</Text>
                              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: theme.text }}>${ex.fare}</Text>
                            </View>
                            {ex.fuel != null && (
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.muted }}>{t.dashboard.expenseFuel}</Text>
                                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: theme.text }}>${ex.fuel}</Text>
                              </View>
                            )}
                            {ex.wear != null && (
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.muted }}>{t.dashboard.expenseWear}</Text>
                                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: theme.text }}>${ex.wear}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </SectionCard>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {FUN_FACTS.map((f) => (
                <SectionCard key={f.label} theme={theme}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.gold400 + '26', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={f.icon} size={17} color={theme.gold500} />
                    </View>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.textFaint }}>{f.label}</Text>
                  </View>
                  <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: 30, color: theme.text, letterSpacing: -0.5 }}>{f.stat}</Text>
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12.5, color: theme.muted, marginTop: 8 }}>{f.route}</Text>
                  <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint, marginTop: 2 }}>{f.date}</Text>
                </SectionCard>
              ))}
            </View>
          )}
        </View>

        {/* Legal disclaimer — applies to every section, not just the paid ones */}
        <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: radii.md, borderWidth: 1, borderColor: theme.cardBorder, backgroundColor: theme.surfaceAlt }}>
          <View style={{ marginTop: 2 }}>
            <Icon name="info" size={15} color={theme.textFaint} />
          </View>
          <Text style={{ flex: 1, fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint, lineHeight: 17 }}>
            {t.dashboard.legalDisclaimer}
          </Text>
        </View>
      </ScrollView>

      <BottomSheet visible={!!infoText} onClose={() => setInfoText(null)} backgroundColor={theme.background} style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.gold400 + '1F', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="info" size={18} color={theme.gold500} />
          </View>
          <Text style={{ flex: 1, fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.text, lineHeight: 21 }}>
            {infoText}
          </Text>
        </View>
      </BottomSheet>
      <BadgeInfoSheet badge={selectedBadge?.type ?? null} count={selectedBadge?.count} onClose={() => setSelectedBadge(null)} />
    </View>
  );
}
