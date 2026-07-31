import { View } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { DelayBadge } from '@/components/ui/DelayBadge';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts } from '@/constants/themes';
import { FlightInfo } from '@/services/flightInfo';
import { formatRelativeTime } from '@/utils/dateFormat';

interface Props {
  info: FlightInfo;
  // Only the post/edit forms pass these — tapping DEPARTURE/ARRIVAL there
  // fills the post's date/time fields. Everywhere else (ride detail, the
  // feed's airport bottom sheet) the card is read-only.
  onApplyDeparture?: () => void;
  onApplyArrival?: () => void;
}

// Shared with app/post/ride.tsx and app/ride/edit/[id].tsx's live
// AeroDataBox lookup card — this renders the same layout from a stored
// `details.flightInfo` snapshot instead (see project decision: snapshot at
// post time, not a live re-fetch on every view, to avoid multiplying calls
// to a paid API with a 500/month free tier).
export function FlightInfoCard({ info, onApplyDeparture, onApplyArrival }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const hasTerminalInfo = info.departure.terminal || info.departure.gate || info.arrival.terminal || info.arrival.gate;

  return (
    <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.cardBorder, backgroundColor: theme.surfaceAlt, padding: 14, gap: 8 }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: theme.text }}>
        {info.airline} · {info.flightNumber} · {info.status}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={onApplyDeparture}
          disabled={!onApplyDeparture}
          style={{ flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}
        >
          <Text style={{ color: theme.muted, fontSize: 11 }}>DEPARTURE</Text>
          <Text style={{ color: theme.text, fontFamily: fonts.bodyBold, fontSize: 13 }}>{info.departure.scheduledTime.split(' ')[1]?.slice(0, 5) ?? '—'}</Text>
          <DelayBadge minutes={info.departure.delayMinutes} theme={theme} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onApplyArrival}
          disabled={!onApplyArrival}
          style={{ flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}
        >
          <Text style={{ color: theme.muted, fontSize: 11 }}>ARRIVAL</Text>
          <Text style={{ color: theme.text, fontFamily: fonts.bodyBold, fontSize: 13 }}>{info.arrival.scheduledTime.split(' ')[1]?.slice(0, 5) ?? '—'}</Text>
          <DelayBadge minutes={info.arrival.delayMinutes} theme={theme} />
        </TouchableOpacity>
      </View>
      {hasTerminalInfo && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 11, color: theme.muted, textAlign: 'center' }}>
            {[info.departure.terminal && `Terminal ${info.departure.terminal}`, info.departure.gate && `Gate ${info.departure.gate}`].filter(Boolean).join(' · ') || '—'}
          </Text>
          <Text style={{ flex: 1, fontSize: 11, color: theme.muted, textAlign: 'center' }}>
            {[info.arrival.terminal && `Terminal ${info.arrival.terminal}`, info.arrival.gate && `Gate ${info.arrival.gate}`].filter(Boolean).join(' · ') || '—'}
          </Text>
        </View>
      )}
      {/* Snapshot taken at post-creation time, never re-fetched on view (see
          the component doc comment above) — this is the only signal the
          viewer has that the delay/gate info might be stale. Older posts
          saved before `fetchedAt` existed just omit the line. */}
      {info.fetchedAt && (
        <Text style={{ fontSize: 10.5, color: theme.textFaint, textAlign: 'center' }}>
          {t.post.flightUpdated} · {formatRelativeTime(info.fetchedAt, t.locale, {
            justNow: t.notificationsScreen.justNow,
            minAgo: t.notificationsScreen.minAgo,
            hAgo: t.notificationsScreen.hAgo,
            yesterday: t.notificationsScreen.yesterday,
            dAgo: t.notificationsScreen.dAgo,
          })}
        </Text>
      )}
    </View>
  );
}
