import { Fragment, useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts } from '@/constants/themes';
import { RidePostKind } from '@/types';

export interface RpmMonthPoint {
  month: string;
  ride: number;
  courier: number;
  hauling: number;
}

export interface RpmTrip {
  kind: RidePostKind;
  month: number; // 0-11
  year: number;
  amount: number;
  miles: number;
}

// Builds each year's monthly $/mi series from the user's own real completed
// driver trips (amount / miles, averaged per kind per month) — replaces the
// old hardcoded RPM_BY_YEAR fixture. Months/kinds with no trips render as 0
// rather than being omitted, so the chart's x-axis stays a stable 12 points.
function buildRpmByYear(trips: RpmTrip[], locale: string): Record<number, RpmMonthPoint[]> {
  const byYear = new Map<number, RpmTrip[]>();
  for (const trip of trips) {
    if (trip.miles <= 0) continue;
    (byYear.get(trip.year) ?? byYear.set(trip.year, []).get(trip.year)!).push(trip);
  }
  const result: Record<number, RpmMonthPoint[]> = {};
  for (const [year, yearTrips] of byYear) {
    const months: RpmMonthPoint[] = [];
    for (let m = 0; m < 12; m++) {
      const label = new Date(year, m, 1).toLocaleDateString(locale, { month: 'short' });
      const avgFor = (kind: RidePostKind) => {
        const matches = yearTrips.filter((t) => t.month === m && t.kind === kind);
        if (matches.length === 0) return 0;
        return matches.reduce((s, t) => s + t.amount / t.miles, 0) / matches.length;
      };
      months.push({ month: label, ride: avgFor('ride'), courier: avgFor('package'), hauling: avgFor('hauling') });
    }
    result[year] = months;
  }
  return result;
}

const CHART_W = 320;
const CHART_H = 150;
const PAD_LEFT = 32;
const PAD_RIGHT = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 22;

export function RpmTrendChart({ trips }: { trips: RpmTrip[] }) {
  const theme = useTheme();
  const t = useTranslation();

  const rpmByYear = useMemo(() => buildRpmByYear(trips, t.locale), [trips, t.locale]);
  const availableYears = useMemo(() => {
    const years = Object.keys(rpmByYear).map(Number).sort((a, b) => a - b);
    return years.length ? years : [new Date().getFullYear()];
  }, [rpmByYear]);
  const [year, setYear] = useState(availableYears[availableYears.length - 1]);
  const data = rpmByYear[year] ?? [];

  const yearIdx = availableYears.indexOf(year);
  const canPrev = yearIdx > 0;
  const canNext = yearIdx >= 0 && yearIdx < availableYears.length - 1;

  const allValues = data.flatMap((p) => [p.ride, p.courier, p.hauling]);
  const maxVal = allValues.length ? Math.max(...allValues) : 1;
  const minVal = allValues.length ? Math.min(...allValues) : 0;
  // A little headroom above/below so the top/bottom lines don't hug the
  // chart edges — plain min/max would clip the peak point's dot.
  const yMax = Math.ceil((maxVal + 0.1) * 10) / 10;
  const yMin = Math.max(0, Math.floor((minVal - 0.1) * 10) / 10);

  const plotW = CHART_W - PAD_LEFT - PAD_RIGHT;
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;

  function xFor(i: number): number {
    return data.length > 1 ? PAD_LEFT + (i / (data.length - 1)) * plotW : PAD_LEFT + plotW / 2;
  }
  function yFor(v: number): number {
    if (yMax === yMin) return PAD_TOP + plotH / 2;
    return PAD_TOP + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
  }

  const series: { key: keyof Omit<RpmMonthPoint, 'month'>; color: string; label: string }[] = [
    { key: 'ride', color: theme.driverText, label: t.dashboard.kindRides },
    { key: 'courier', color: theme.courierText, label: t.dashboard.kindCourier },
    { key: 'hauling', color: theme.haulingText, label: t.dashboard.kindHauling },
  ];

  const GRID_LINES = 4;

  return (
    <View>
      {/* Year selector */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 10 }}>
        <TouchableOpacity disabled={!canPrev} onPress={() => setYear(availableYears[yearIdx - 1])} style={{ opacity: canPrev ? 1 : 0.3, padding: 4 }}>
          <Icon name="chevron_left" size={18} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.text, minWidth: 44, textAlign: 'center' }}>{year}</Text>
        <TouchableOpacity disabled={!canNext} onPress={() => setYear(availableYears[yearIdx + 1])} style={{ opacity: canNext ? 1 : 0.3, padding: 4 }}>
          <Icon name="chevron_right" size={18} color={theme.text} />
        </TouchableOpacity>
      </View>

      <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
          {/* Horizontal gridlines + $/mi labels */}
          {Array.from({ length: GRID_LINES + 1 }).map((_, i) => {
            const v = yMin + ((yMax - yMin) * i) / GRID_LINES;
            const y = yFor(v);
            return (
              <Fragment key={i}>
                <Line x1={PAD_LEFT} y1={y} x2={CHART_W - PAD_RIGHT} y2={y} stroke={theme.cardBorder} strokeWidth={1} />
                <SvgText x={PAD_LEFT - 6} y={y + 3} fontSize={8} fill={theme.textFaint} textAnchor="end">
                  {`$${v.toFixed(2)}`}
                </SvgText>
              </Fragment>
            );
          })}

          {/* Month labels — every other month if there are more than 8, so
              they don't overlap on the 12-month years. */}
          {data.map((p, i) => (
            (data.length <= 8 || i % 2 === 0) && (
              <SvgText key={p.month} x={xFor(i)} y={CHART_H - 6} fontSize={8} fill={theme.textFaint} textAnchor="middle">
                {p.month}
              </SvgText>
            )
          ))}

          {/* One polyline + dots per service */}
          {series.map((s) => (
            <Fragment key={s.key}>
              <Polyline
                points={data.map((p, i) => `${xFor(i)},${yFor(p[s.key])}`).join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {data.map((p, i) => (
                <Circle key={i} cx={xFor(i)} cy={yFor(p[s.key])} r={2.5} fill={s.color} />
              ))}
            </Fragment>
          ))}
        </Svg>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, justifyContent: 'center' }}>
        {series.map((s) => (
          <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 12, height: 2.5, borderRadius: 2, backgroundColor: s.color }} />
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.muted }}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
