import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/store/authStore';
import { useRideAgreements } from '@/hooks/useRideAgreements';
import { RideAgreement, AgreementStatus } from '@/types';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { IconName } from '@/constants/icons';

type UiStatus = 'upcoming' | 'completed' | 'cancelled';

interface CalendarItem {
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
}

function toUiStatus(s: AgreementStatus): UiStatus {
  if (s === 'completed') return 'completed';
  if (s === 'cancelled' || s === 'no_show') return 'cancelled';
  return 'upcoming';
}

const KIND_ROUTE: Record<CalendarItem['kind'], '/ride/[id]' | '/package/[id]' | '/hauling/[id]'> = {
  ride: '/ride/[id]',
  package: '/package/[id]',
  hauling: '/hauling/[id]',
};

export default function CalendarScreen() {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const { getMyAgreements } = useRideAgreements();

  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<number | null>(null);

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
      const mapped: CalendarItem[] = agreements
        .filter((a) => a.post)
        .map((a: RideAgreement) => {
          const isDriver = a.driver_id === uid;
          const other = isDriver ? a.rider : a.driver;
          return {
            id: a.id,
            postId: a.post_id,
            kind: (a.post!.kind ?? 'ride') as CalendarItem['kind'],
            isDriver,
            otherName: other?.full_name ?? '—',
            otherAvatar: other?.avatar_url,
            originCity: a.post!.origin_city,
            destinationCity: a.post!.destination_city,
            scheduledAt: new Date(a.post!.scheduled_at),
            donation: a.post!.suggested_donation,
            status: toUiStatus(a.status),
          };
        });
      setItems(mapped);
    } finally {
      setLoading(false);
    }
  }, [session, getMyAgreements]);

  useEffect(() => { load(); }, [load]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const itemsInMonth = items.filter(
    (it) => it.scheduledAt.getFullYear() === viewYear && it.scheduledAt.getMonth() === viewMonth
  );
  const itemsByDay: Record<number, CalendarItem[]> = {};
  itemsInMonth.forEach((it) => {
    const d = it.scheduledAt.getDate();
    (itemsByDay[d] ??= []).push(it);
  });

  const todayD = today.getMonth() === viewMonth && today.getFullYear() === viewYear ? today.getDate() : null;

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); } else setViewMonth((m) => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); } else setViewMonth((m) => m + 1);
    setSelected(null);
  }

  const listItems = selected != null
    ? (itemsByDay[selected] ?? [])
    : [...itemsInMonth].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const nextRide = [...items]
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
            {t.calendar.mySchedule}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14 }}>
          <TouchableOpacity onPress={prevMonth} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: theme.cardBorder, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm }}>
            <Icon name="chevron_left" size={18} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: 22, letterSpacing: letterSpacingFor(22, tracking.tight), color: theme.cream }}>
            {t.calendar.monthNames[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: theme.cardBorder, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm }}>
            <Icon name="chevron_right" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10 }}>
          {t.calendar.dayNames.map((d) => (
            <Text key={d} style={{ flex: 1, textAlign: 'center', fontFamily: fonts.bodyExtraBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: letterSpacingFor(10, tracking.wide), color: 'rgba(255,248,240,0.6)', paddingVertical: 4 }}>
              {d}
            </Text>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 }}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <View key={`e${i}`} style={{ width: `${100 / 7}%` }} />
          ))}
          {cells.map((day) => {
            const dayItems = itemsByDay[day] ?? [];
            const isToday = day === todayD;
            const isSel = day === selected;
            const hasCompleted = dayItems.some((it) => it.status === 'completed');
            const hasCancelled = dayItems.some((it) => it.status === 'cancelled');
            const hasUpcoming = dayItems.some((it) => it.status === 'upcoming');
            return (
              <TouchableOpacity
                key={day}
                onPress={() => setSelected(isSel ? null : day)}
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
        <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.textFaint, padding: 16, paddingBottom: 8 }}>
          {selected != null ? `${t.calendar.monthNames[viewMonth]} ${selected}` : t.calendar.upcoming}
        </Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={theme.primary} />
        ) : listItems.length === 0 ? (
          <Text style={{ textAlign: 'center', paddingTop: 20, fontFamily: fonts.bodyRegular, fontSize: 14, color: theme.muted }}>
            {selected != null ? t.calendar.noRidesThisDay : t.calendar.noUpcomingRides}
          </Text>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            {listItems.map((it) => <RideRow key={it.id} item={it} theme={theme} t={t} />)}
          </View>
        )}

        <View style={{ padding: 16 }}>
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
      </ScrollView>
    </View>
  );
}

function RideRow({ item, theme, t }: { item: CalendarItem; theme: ReturnType<typeof useTheme>; t: ReturnType<typeof useTranslation> }) {
  const kindConfig: Record<CalendarItem['kind'], { accent: string; icon: IconName; label: string }> = {
    ride: { accent: item.isDriver ? theme.driverText : theme.passengerText, icon: item.isDriver ? 'car' : 'passenger', label: item.isDriver ? t.feed.chipPooling : t.feed.chipRide },
    package: { accent: theme.courierText, icon: 'package', label: t.post.chooserPackageTitle },
    hauling: { accent: theme.haulingText, icon: 'truck', label: t.post.chooserHaulingTitle },
  };
  const config = kindConfig[item.kind];
  const isCancelled = item.status === 'cancelled';
  const accent = isCancelled ? theme.textFaint : config.accent;

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: KIND_ROUTE[item.kind], params: { id: item.postId } })}
      style={{
        position: 'relative', flexDirection: 'row', alignItems: 'center', gap: 13,
        backgroundColor: theme.surface, borderRadius: radii.md, borderWidth: 1, borderColor: theme.cardBorder,
        paddingVertical: 14, paddingHorizontal: 14, minHeight: 78, overflow: 'hidden',
        ...shadows.xs,
      }}
    >
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: accent }} />
      <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: isCancelled ? theme.surfaceAlt : accent + '1F' }}>
        <Icon name={config.icon} size={20} color={accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 14.5, color: theme.text }}>
          {item.originCity} → {item.destinationCity}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <Badge tone={item.status === 'cancelled' ? 'neutral' : item.status === 'completed' ? 'success' : 'warning'} size="sm">{config.label}</Badge>
          <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemibold, fontSize: 11.5, color: theme.muted }}>{item.otherName}</Text>
        </View>
        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint, marginTop: 3 }}>
          {item.scheduledAt.toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })} · {item.scheduledAt.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}
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
  );
}
