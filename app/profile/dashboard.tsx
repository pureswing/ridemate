import { View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { IconName } from '@/constants/icons';

// Ported from ui_kits/ridemate-app/Dashboard.jsx — PURELY VISUAL. Every
// number on this screen is a local fixture, not a real query (no
// Supabase/hooks calls at all). The design source computes these from
// window.RM_* globals (ride history, bid stats, cancellation stats,
// community rank, etc.) that don't exist as real backend concepts in this
// app yet — this screen exists to preview the visual design, not to report
// real activity. Wire it to real data later once those concepts exist.
const RPM_DATA = [
  { label: 'Rides', value: 0.61, color: '#0A7E77' },
  { label: 'Courier', value: 0.94, color: '#08637A' },
  { label: 'Hauling', value: 1.28, color: '#9E4A14' },
];
const IRS_RATE = 0.725;

const BID_HISTORY = [true, true, false, true, true, true, false, true]; // won/lost, oldest→newest
const BID_WIN_RATE = Math.round((BID_HISTORY.filter(Boolean).length / BID_HISTORY.length) * 100);

const CANCELLATION = { avgNoticeHours: 14, flags: 1, flagThreshold: 5 };

const BADGES: { icon: IconName; label: string; count: number; color: string }[] = [
  { icon: 'car', label: 'Clean car', count: 12, color: '#0E9C93' },
  { icon: 'schedule', label: 'Punctual', count: 9, color: '#B8860B' },
  { icon: 'handshake', label: 'Friendly', count: 15, color: '#ED4A2B' },
  { icon: 'star', label: 'Great company', count: 6, color: '#9E4A14' },
];

const RANK_TIERS = ['New', 'Active', 'Trusted', 'Elite'];
const CURRENT_TIER = 2; // index into RANK_TIERS — "Trusted"

const MILESTONES: { icon: IconName; label: string; progress: number; goal: string }[] = [
  { icon: 'route', label: '50 rides completed', progress: 0.76, goal: '38 / 50' },
  { icon: 'event', label: '6 months on RideMate', progress: 0.5, goal: '3 / 6 mo' },
  { icon: 'star', label: '10 badges earned', progress: 0.8, goal: '8 / 10' },
  { icon: 'shield_check', label: 'Zero no-shows streak', progress: 1, goal: '12 / 12' },
];

const EARNINGS = [
  { label: 'Rides', amount: 340, color: '#0A7E77' },
  { label: 'Courier', amount: 128, color: '#08637A' },
  { label: 'Hauling', amount: 96, color: '#9E4A14' },
];
const EARNINGS_TOTAL = EARNINGS.reduce((s, e) => s + e.amount, 0);

function SectionCard({ title, subtitle, children, theme }: { title: string; subtitle?: string; children: React.ReactNode; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={{
      backgroundColor: theme.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.cardBorder,
      padding: 18, ...shadows.sm,
    }}>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 15.5, color: theme.text }}>{title}</Text>
      {subtitle && <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.muted, marginTop: 2 }}>{subtitle}</Text>}
      <View style={{ marginTop: 14 }}>{children}</View>
    </View>
  );
}

export default function DashboardScreen() {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  const maxRpm = Math.max(IRS_RATE, ...RPM_DATA.map((r) => r.value));

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg }}
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', gap: 10, backgroundColor: theme.gold400 + '18', borderWidth: 1, borderColor: theme.borderGold, borderRadius: radii.md, padding: 12 }}>
          <View style={{ marginTop: 1 }}>
            <Icon name="info" size={16} color={theme.gold500} />
          </View>
          <Text style={{ flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.muted, lineHeight: 17 }}>
            {t.dashboard.mockNotice}
          </Text>
        </View>

        {/* Revenue per mile */}
        <SectionCard title={t.dashboard.rpmTitle} subtitle={t.dashboard.rpmSub} theme={theme}>
          <View style={{ gap: 10 }}>
            {RPM_DATA.map((r) => (
              <View key={r.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12.5, color: theme.text }}>{r.label}</Text>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: r.value >= IRS_RATE ? theme.driverText : theme.danger }}>
                    ${r.value.toFixed(2)}/mi
                  </Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.surfaceAlt, overflow: 'hidden' }}>
                  <View style={{ width: `${(r.value / maxRpm) * 100}%`, height: '100%', backgroundColor: r.color, borderRadius: 4 }} />
                </View>
              </View>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <View style={{ width: 8, height: 2, backgroundColor: theme.textFaint }} />
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint }}>IRS baseline · ${IRS_RATE}/mi</Text>
            </View>
          </View>
        </SectionCard>

        {/* Bid win rate */}
        <SectionCard title={t.dashboard.bidWinTitle} subtitle={t.dashboard.bidWinSub} theme={theme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32, borderWidth: 6, borderColor: theme.driverText,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: 16, color: theme.text }}>{BID_WIN_RATE}%</Text>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 40 }}>
              {BID_HISTORY.map((won, i) => (
                <View key={i} style={{
                  flex: 1, height: won ? 40 : 18, borderRadius: 3,
                  backgroundColor: won ? theme.driverText : theme.surfaceAlt,
                }} />
              ))}
            </View>
          </View>
        </SectionCard>

        {/* Cancellation reliability */}
        <SectionCard title={t.dashboard.cancelTitle} subtitle={t.dashboard.cancelSub} theme={theme}>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: 22, color: theme.text }}>{CANCELLATION.avgNoticeHours}h</Text>
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.muted }}>avg. notice</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: theme.text, marginBottom: 4 }}>
                {CANCELLATION.flags} / {CANCELLATION.flagThreshold} flags
              </Text>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.surfaceAlt, overflow: 'hidden' }}>
                <View style={{
                  width: `${(CANCELLATION.flags / CANCELLATION.flagThreshold) * 100}%`, height: '100%',
                  backgroundColor: theme.danger, borderRadius: 4,
                }} />
              </View>
            </View>
          </View>
        </SectionCard>

        {/* Community badges */}
        <SectionCard title={t.dashboard.badgesTitle} theme={theme}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {BADGES.map((b) => (
              <View key={b.label} style={{ alignItems: 'center', gap: 5, width: 64 }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 14, backgroundColor: b.color + '18',
                  borderWidth: 1.5, borderColor: b.color + '45', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={b.icon} size={20} color={b.color} />
                </View>
                <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: theme.text }}>{b.count}×</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        {/* Community rank */}
        <SectionCard title={t.dashboard.rankTitle} subtitle={t.dashboard.rankSub} theme={theme}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {RANK_TIERS.map((tier, i) => (
              <View key={tier} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <View style={{
                  width: '100%', height: 6, borderRadius: 3,
                  backgroundColor: i <= CURRENT_TIER ? theme.gold500 : theme.surfaceAlt,
                }} />
                <Text style={{
                  fontFamily: i === CURRENT_TIER ? fonts.bodyExtraBold : fonts.bodyMedium,
                  fontSize: 10.5, color: i === CURRENT_TIER ? theme.gold500 : theme.textFaint,
                }}>
                  {tier}
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>

        {/* Milestones */}
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

        {/* Earnings breakdown */}
        <SectionCard title={t.dashboard.earningsTitle} subtitle={t.dashboard.earningsSub} theme={theme}>
          <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: 24, color: theme.text, marginBottom: 12 }}>
            ${EARNINGS_TOTAL}
          </Text>
          <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
            {EARNINGS.map((e) => (
              <View key={e.label} style={{ width: `${(e.amount / EARNINGS_TOTAL) * 100}%`, backgroundColor: e.color }} />
            ))}
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
      </ScrollView>
    </View>
  );
}
