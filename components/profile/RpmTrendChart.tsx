import { Fragment, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts } from '@/constants/themes';

export interface RpmMonthPoint {
  month: string;
  ride: number;
  courier: number;
  hauling: number;
}

// Mock per-year monthly $/mi series — the whole Dashboard is local-fixture
// data (see this screen's own top-of-file comment), so "fetching" a year
// here means swapping between these fixed arrays behind a brief simulated
// delay, not a real backend call. A real implementation would replace
// fetchRpmMonthly's body with an actual query, keeping the same signature.
const RPM_BY_YEAR: Record<number, RpmMonthPoint[]> = {
  2026: [
    { month: 'Jan', ride: 0.52, courier: 0.81, hauling: 1.10 },
    { month: 'Feb', ride: 0.55, courier: 0.85, hauling: 1.15 },
    { month: 'Mar', ride: 0.58, courier: 0.88, hauling: 1.19 },
    { month: 'Apr', ride: 0.57, courier: 0.90, hauling: 1.22 },
    { month: 'May', ride: 0.60, courier: 0.92, hauling: 1.24 },
    { month: 'Jun', ride: 0.63, courier: 0.95, hauling: 1.27 },
    { month: 'Jul', ride: 0.61, courier: 0.94, hauling: 1.28 },
    { month: 'Aug', ride: 0.64, courier: 0.97, hauling: 1.31 },
  ],
  2025: [
    { month: 'Jan', ride: 0.44, courier: 0.70, hauling: 0.98 },
    { month: 'Feb', ride: 0.46, courier: 0.72, hauling: 1.00 },
    { month: 'Mar', ride: 0.48, courier: 0.75, hauling: 1.03 },
    { month: 'Apr', ride: 0.50, courier: 0.77, hauling: 1.05 },
    { month: 'May', ride: 0.49, courier: 0.79, hauling: 1.07 },
    { month: 'Jun', ride: 0.52, courier: 0.81, hauling: 1.09 },
    { month: 'Jul', ride: 0.51, courier: 0.83, hauling: 1.11 },
    { month: 'Aug', ride: 0.53, courier: 0.84, hauling: 1.12 },
    { month: 'Sep', ride: 0.54, courier: 0.86, hauling: 1.14 },
    { month: 'Oct', ride: 0.55, courier: 0.87, hauling: 1.16 },
    { month: 'Nov', ride: 0.57, courier: 0.89, hauling: 1.18 },
    { month: 'Dec', ride: 0.59, courier: 0.91, hauling: 1.20 },
  ],
  2024: [
    { month: 'Jan', ride: 0.38, courier: 0.60, hauling: 0.85 },
    { month: 'Feb', ride: 0.39, courier: 0.62, hauling: 0.87 },
    { month: 'Mar', ride: 0.41, courier: 0.64, hauling: 0.89 },
    { month: 'Apr', ride: 0.42, courier: 0.65, hauling: 0.91 },
    { month: 'May', ride: 0.43, courier: 0.67, hauling: 0.93 },
    { month: 'Jun', ride: 0.45, courier: 0.69, hauling: 0.95 },
    { month: 'Jul', ride: 0.44, courier: 0.68, hauling: 0.96 },
    { month: 'Aug', ride: 0.46, courier: 0.70, hauling: 0.98 },
    { month: 'Sep', ride: 0.47, courier: 0.71, hauling: 0.99 },
    { month: 'Oct', ride: 0.48, courier: 0.73, hauling: 1.01 },
    { month: 'Nov', ride: 0.49, courier: 0.74, hauling: 1.02 },
    { month: 'Dec', ride: 0.50, courier: 0.76, hauling: 1.04 },
  ],
};

const AVAILABLE_YEARS = [2024, 2025, 2026];

function fetchRpmMonthly(year: number): Promise<RpmMonthPoint[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(RPM_BY_YEAR[year] ?? []), 350);
  });
}

const CHART_W = 320;
const CHART_H = 150;
const PAD_LEFT = 32;
const PAD_RIGHT = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 22;

export function RpmTrendChart({ defaultYear = 2026 }: { defaultYear?: number }) {
  const theme = useTheme();
  const t = useTranslation();
  const [year, setYear] = useState(defaultYear);
  const [data, setData] = useState<RpmMonthPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRpmMonthly(year).then((points) => { if (!cancelled) { setData(points); setLoading(false); } });
    return () => { cancelled = true; };
  }, [year]);

  const yearIdx = AVAILABLE_YEARS.indexOf(year);
  const canPrev = yearIdx > 0;
  const canNext = yearIdx < AVAILABLE_YEARS.length - 1;

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
        <TouchableOpacity disabled={!canPrev} onPress={() => setYear(AVAILABLE_YEARS[yearIdx - 1])} style={{ opacity: canPrev ? 1 : 0.3, padding: 4 }}>
          <Icon name="chevron_left" size={18} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.text, minWidth: 44, textAlign: 'center' }}>{year}</Text>
        <TouchableOpacity disabled={!canNext} onPress={() => setYear(AVAILABLE_YEARS[yearIdx + 1])} style={{ opacity: canNext ? 1 : 0.3, padding: 4 }}>
          <Icon name="chevron_right" size={18} color={theme.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
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
      )}

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
