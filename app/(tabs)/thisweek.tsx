import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { RouteLine } from '@/components/ride/RouteLine';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/store/authStore';
import { useRideAgreements } from '@/hooks/useRideAgreements';
import { RideAgreement, AgreementStatus } from '@/types';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { IconName } from '@/constants/icons';

type UiStatus = 'upcoming' | 'completed' | 'cancelled';

interface WeekItem {
  id: string;
  postId: string;
  kind: 'ride' | 'package' | 'hauling';
  isDriver: boolean;
  otherName: string;
  otherAvatar?: string;
  originCity: string;
  destinationCity: string;
  scheduledAt: Date;
  donation?: number;
  status: UiStatus;
  // 'Anytime this week' hauling jobs (details.flexibleDate) — scheduledAt on
  // these is a fake placeholder (see app/post/hauling.tsx), never a real
  // commitment, so they're never bucketed into the day grid or treated as
  // the "next ride" below; they get their own always-visible section instead.
  isFlexible: boolean;
}

function toUiStatus(s: AgreementStatus): UiStatus {
  if (s === 'completed') return 'completed';
  if (s === 'cancelled' || s === 'no_show') return 'cancelled';
  return 'upcoming';
}

const KIND_ROUTE: Record<WeekItem['kind'], '/ride/[id]' | '/package/[id]' | '/hauling/[id]'> = {
  ride: '/ride/[id]',
  package: '/package/[id]',
  hauling: '/hauling/[id]',
};

function startOfWeek(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - s.getDay());
  return s;
}

// This-week screen — same visual format as the (currently unused, kept for
// reference) full calendar.tsx, but locked to the current Sun-Sat week: no
// prev/next navigation, just this week's 7 days plus a "Week N, Mon D–Mon D"
// line under the month/year heading.
export default function ThisWeekScreen() {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const { getMyAgreements } = useRideAgreements();

  const [items, setItems] = useState<WeekItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Always a specific day, never "show everything" — defaults to today.
  // Tapping a day switches to it; there's no toggle-back-to-null anymore.
  const [selected, setSelected] = useState(new Date().getDate());

  // Reminders panel — UI only for now, no real push/local notification
  // scheduling wired up yet (the app has no notifications infra at all).
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderStep, setReminderStep] = useState(1); // 0=2h 1=4h 2=12h 3=24h
  const [reminderRecurring, setReminderRecurring] = useState(false);
  const REMINDER_STEPS = ['2h', '4h', '12h', '24h'];

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const agreements = await getMyAgreements();
      const uid = session.user.id;
      const mapped: WeekItem[] = agreements
        .filter((a) => a.post)
        .map((a: RideAgreement) => {
          const isDriver = a.driver_id === uid;
          const other = isDriver ? a.rider : a.driver;
          return {
            id: a.id,
            postId: a.post_id,
            kind: (a.post!.kind ?? 'ride') as WeekItem['kind'],
            isDriver,
            otherName: other?.full_name ?? '—',
            otherAvatar: other?.avatar_url,
            originCity: a.post!.origin_city,
            destinationCity: a.post!.destination_city,
            scheduledAt: new Date(a.post!.scheduled_at),
            donation: a.post!.suggested_donation,
            status: toUiStatus(a.status),
            isFlexible: (a.post!.details as any)?.flexibleDate === true,
          };
        });
      setItems(mapped);
    } finally {
      setLoading(false);
    }
  }, [session, getMyAgreements]);

  useEffect(() => { load(); }, [load]);

  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekEnd = weekDays[6];
  const weekNumber = Math.ceil((weekStart.getDate() + new Date(weekStart.getFullYear(), weekStart.getMonth(), 1).getDay()) / 7);
  const weekRangeLabel = `${t.calendar.weekPrefix} ${weekNumber}, ${weekStart.toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })}–${weekEnd.toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })}`;

  // Flexible-date jobs never had a real day to begin with — pulled out of
  // the day grid entirely instead of pinning them to their fake placeholder
  // date, and shown in their own always-visible section below.
  const flexibleItems = items.filter((it) => it.isFlexible);
  const datedItems = items.filter((it) => !it.isFlexible);

  const itemsInWeek = datedItems.filter((it) => it.scheduledAt >= weekStart && it.scheduledAt <= new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59));
  const itemsByDay: Record<number, WeekItem[]> = {};
  itemsInWeek.forEach((it) => {
    const d = it.scheduledAt.getDate();
    (itemsByDay[d] ??= []).push(it);
  });

  const listItems = itemsByDay[selected] ?? [];

  const nextRide = [...datedItems]
    .filter((it) => it.status === 'upcoming' && it.scheduledAt.getTime() > Date.now())
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0] ?? null;

  const reminderSubtitle = reminderOn && nextRide
    ? `${t.calendar.reminderBefore}: ${REMINDER_STEPS[reminderStep]} ${t.calendar.before} · ${nextRide.scheduledAt.toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })} ${nextRide.scheduledAt.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}`
    : nextRide
      ? `${t.calendar.next}: ${nextRide.scheduledAt.toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })} · ${nextRide.scheduledAt.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}`
      : t.calendar.noUpcomingRides;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 14, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg, zIndex: 10 }}
      >
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {t.calendar.thisWeekEyebrow}
          </Text>
        </View>

        <View style={{ alignItems: 'center', paddingTop: 14 }}>
          <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: 22, letterSpacing: letterSpacingFor(22, tracking.tight), color: theme.cream }}>
            {t.calendar.monthNames[weekStart.getMonth()]} {weekStart.getFullYear()}
          </Text>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12.5, color: theme.gold300, marginTop: 2 }}>
            {weekRangeLabel}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12 }}>
          {t.calendar.dayNames.map((d) => (
            <Text key={d} style={{ flex: 1, textAlign: 'center', fontFamily: fonts.bodyExtraBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: letterSpacingFor(10, tracking.wide), color: 'rgba(255,248,240,0.6)', paddingVertical: 4 }}>
              {d}
            </Text>
          ))}
        </View>

        <View style={{ flexDirection: 'row', paddingHorizontal: 12 }}>
          {weekDays.map((d) => {
            const day = d.getDate();
            const dayItems = itemsByDay[day] ?? [];
            const isToday = d.toDateString() === today.toDateString();
            const isSel = day === selected;
            const hasCompleted = dayItems.some((it) => it.status === 'completed');
            const hasCancelled = dayItems.some((it) => it.status === 'cancelled');
            const hasUpcoming = dayItems.some((it) => it.status === 'upcoming');
            return (
              <TouchableOpacity
                key={day}
                onPress={() => setSelected(day)}
                style={{ width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 5, borderRadius: 8, backgroundColor: isSel ? 'rgba(255,248,240,0.9)' : isToday ? 'rgba(255,248,240,0.2)' : 'transparent' }}
              >
                <Text style={{ fontFamily: isToday || isSel ? fonts.bodyExtraBold : fonts.bodyMedium, fontSize: 13, color: isSel ? '#1A1209' : isToday ? theme.gold300 : theme.cream }}>
                  {day}
                </Text>
                <View style={{ flexDirection: 'row', gap: 2, minHeight: 7, marginTop: 2 }}>
                  {hasUpcoming && <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: theme.secondary }} />}
                  {hasCompleted && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.secondary }} />}
                  {hasCancelled && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.danger }} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 10 }}>
          {[
            { color: theme.secondary, label: t.calendar.upcoming, filled: false },
            { color: theme.secondary, label: t.calendar.completed, filled: true },
            { color: theme.danger, label: t.calendar.cancelled, filled: true },
          ].map((it) => (
            <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: it.filled ? it.color : 'transparent', borderWidth: it.filled ? 0 : 1.5, borderColor: it.color }} />
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: letterSpacingFor(10.5, tracking.wide), color: 'rgba(255,248,240,0.6)' }}>
                {it.label}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Always visible regardless of which day tab is selected — these
            jobs don't have a real day, so pinning this section to `selected`
            would be exactly the misleading behavior this section exists to
            avoid. */}
        {!loading && flexibleItems.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.textFaint, paddingBottom: 8 }}>
              {t.calendar.flexibleSectionTitle}
            </Text>
            <View style={{ gap: 8 }}>
              {flexibleItems.map((it) => <WeekRow key={it.id} item={it} theme={theme} t={t} />)}
            </View>
          </View>
        )}

        <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.textFaint, padding: 16, paddingBottom: 8 }}>
          {t.calendar.monthNames[weekStart.getMonth()]} {selected}
        </Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={theme.primary} />
        ) : listItems.length === 0 ? (
          <Text style={{ textAlign: 'center', paddingTop: 20, fontFamily: fonts.bodyRegular, fontSize: 14, color: theme.muted }}>
            {t.calendar.noRidesThisDay}
          </Text>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            {listItems.map((it) => <WeekRow key={it.id} item={it} theme={theme} t={t} />)}
          </View>
        )}

      </ScrollView>

      {/* Fixed to the bottom of the screen, not scrolling with the ride list —
          a sibling of the ScrollView, not inside its content. */}
      <View style={{
        backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.cardBorder,
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom - 30, ...shadows.lg,
      }}>
        <View style={{
          backgroundColor: theme.surface, borderRadius: radii.lg, overflow: 'hidden',
          borderWidth: 1, borderColor: reminderOn ? theme.borderGold : theme.cardBorder,
          ...(reminderOn ? shadows.sm : shadows.xs),
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: reminderOn ? theme.gold400 + '24' : theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="notification" size={19} color={reminderOn ? theme.gold500 : theme.muted} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: theme.text }}>{t.calendar.reminders}</Text>
              <Text numberOfLines={1} style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint, marginTop: 1 }}>
                {reminderSubtitle}
              </Text>
            </View>
            <TouchableOpacity
              disabled={!nextRide}
              onPress={() => setReminderOn((v) => !v)}
              style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: reminderOn ? theme.gold500 : theme.border, opacity: nextRide ? 1 : 0.4 }}
            >
              <View style={{ position: 'absolute', top: 3, left: reminderOn ? 21 : 3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', ...shadows.sm }} />
            </TouchableOpacity>
          </View>

          {reminderOn && (
            <View style={{ padding: 14, paddingTop: 0 }}>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                {REMINDER_STEPS.map((s, i) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setReminderStep(i)}
                    style={{ flex: 1, height: 30, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: i === reminderStep ? theme.gold500 : theme.surfaceAlt }}
                  >
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: i === reminderStep ? '#1A1209' : theme.textFaint }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: theme.muted }}>{t.calendar.recurring}</Text>
                <TouchableOpacity
                  onPress={() => setReminderRecurring((v) => !v)}
                  style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: reminderRecurring ? theme.driverText : theme.border }}
                >
                  <View style={{ position: 'absolute', top: 3, left: reminderRecurring ? 21 : 3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', ...shadows.sm }} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function WeekRow({ item, theme, t }: { item: WeekItem; theme: ReturnType<typeof useTheme>; t: ReturnType<typeof useTranslation> }) {
  const kindConfig: Record<WeekItem['kind'], { accent: string; icon: IconName; label: string }> = {
    ride: { accent: item.isDriver ? theme.driverText : theme.passengerText, icon: item.isDriver ? 'car' : 'passenger', label: item.isDriver ? t.feed.chipPooling : t.feed.chipRide },
    package: { accent: theme.courierText, icon: 'package', label: t.post.chooserPackageTitle },
    hauling: { accent: theme.haulingText, icon: 'truck', label: t.post.chooserHaulingTitle },
  };
  const config = kindConfig[item.kind];
  const isCancelled = item.status === 'cancelled';
  const accent = isCancelled ? theme.textFaint : config.accent;

  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: KIND_ROUTE[item.kind], params: { id: item.postId } })}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 13,
          backgroundColor: theme.surface, borderRadius: radii.md, borderWidth: 1, borderColor: theme.cardBorder,
          paddingVertical: 14, paddingHorizontal: 14, minHeight: 78, overflow: 'hidden',
          ...shadows.xs,
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: isCancelled ? theme.surfaceAlt : accent + '1F' }}>
          <Icon name={config.icon} size={20} color={accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <RouteLine
            origin={item.originCity}
            destination={item.destinationCity !== item.originCity ? item.destinationCity : undefined}
            fontSize={14}
            style={{ marginBottom: 6 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <View style={{
              paddingHorizontal: 6, paddingVertical: 1, borderRadius: radii.pill,
              backgroundColor: accent + '1E', borderWidth: 1, borderColor: accent,
            }}>
              <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: letterSpacingFor(10, tracking.wide), color: accent }}>
                {config.label}
              </Text>
            </View>
            <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemibold, fontSize: 11.5, color: theme.muted }}>{item.otherName}</Text>
          </View>
          <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint, marginTop: 3 }}>
            {item.isFlexible
              ? t.calendar.flexibleBadge
              : `${item.scheduledAt.toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })} · ${item.scheduledAt.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}`}
          </Text>
        </View>
        <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 13, color: accent, flexShrink: 0 }}>
          {isCancelled ? '—' : item.donation != null ? `${item.isDriver ? '+' : '-'}$${item.donation}` : '—'}
        </Text>

        {(item.status === 'completed' || item.status === 'cancelled') && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
              transform: [{ rotate: '-14deg' }],
              borderWidth: 1.5, borderColor: item.status === 'cancelled' ? theme.danger + '40' : theme.secondary + '40',
              borderRadius: 6, paddingHorizontal: 10, paddingVertical: 2,
            }}>
              <Text style={{
                fontFamily: fonts.bodyExtraBold, fontSize: 20, letterSpacing: letterSpacingFor(20, tracking.wide), textTransform: 'uppercase',
                color: item.status === 'cancelled' ? theme.danger + '40' : theme.secondary + '40',
              }}>
                {item.status === 'cancelled' ? t.calendar.cancelledStamp : t.calendar.completedStamp}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
      {/* Sibling of the bordered/clipped card above, not nested inside it —
          matches components/ui/Card.tsx's accentStripe technique. Nesting it
          inside the bordered container measures its corner radius against a
          box already inset by the card's own 1px border, so the curve lands
          short and leaves a sliver of the card's border color visible at the
          top-left/bottom-left corners. As a sibling, painted after, it fully
          covers that edge. */}
      <View style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: radii.md + 6,
        backgroundColor: 'transparent', borderLeftWidth: 4, borderLeftColor: accent,
        borderTopLeftRadius: radii.md, borderBottomLeftRadius: radii.md, overflow: 'hidden',
      }} />
    </View>
  );
}
