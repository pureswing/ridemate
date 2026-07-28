import { View } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { RouteLine } from '@/components/ride/RouteLine';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { RideAgreement } from '@/types';
import { fonts, radii, shadows } from '@/constants/themes';
import { IconName } from '@/constants/icons';

interface Props {
  agreement: RideAgreement;
  myId: string;
  onPress: () => void;
  // Long-pressing any card enters selection mode; while active, a normal
  // tap on any card toggles it instead of opening the ride record, and a
  // checkbox appears to its left (per the request — outside the card, not
  // overlapping its own content).
  selectionMode: boolean;
  selected: boolean;
  onLongPress: () => void;
  onToggleSelect: () => void;
}

// Same card shell as thisweek.tsx/calendar.tsx's job rows (RouteLine, icon
// box, curved left accent stripe) but stripped down per the ride-history
// spec: no price, no other-party name, no kind badge pill — the icon alone
// carries the kind, since every row here is already known-completed.
export function HistoryCard({ agreement, myId, onPress, selectionMode, selected, onLongPress, onToggleSelect }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const post = agreement.post;
  const isDriver = agreement.driver_id === myId;
  const kind = post?.kind ?? 'ride';

  const iconFor: Record<string, IconName> = {
    ride: isDriver ? 'car' : 'passenger',
    package: 'package',
    hauling: 'truck',
  };
  const accent = kind === 'package' ? theme.courierText : kind === 'hauling' ? theme.haulingText : (isDriver ? theme.driverText : theme.passengerText);
  const scheduledAt = post?.scheduled_at ? new Date(post.scheduled_at) : null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {selectionMode && (
        <TouchableOpacity
          onPress={onToggleSelect}
          style={{
            width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: selected ? theme.primary : theme.border,
            backgroundColor: selected ? theme.primary : 'transparent',
          }}
        >
          {selected && <Icon name="check" size={14} color={theme.textOnPrimary} strokeWidth={3} />}
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={selectionMode ? onToggleSelect : onPress}
        onLongPress={onLongPress}
        style={{
          flex: 1,
          position: 'relative', flexDirection: 'row', alignItems: 'center', gap: 13,
          backgroundColor: theme.surface, borderRadius: radii.md, borderWidth: 1, borderColor: theme.cardBorder,
          paddingVertical: 14, paddingHorizontal: 14, minHeight: 66, overflow: 'hidden',
          ...shadows.xs,
        }}
      >
        <View style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: radii.md + 6,
          backgroundColor: 'transparent', borderLeftWidth: 4, borderLeftColor: accent,
          borderTopLeftRadius: radii.md, borderBottomLeftRadius: radii.md, overflow: 'hidden',
        }} />
        <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: accent + '1F' }}>
          <Icon name={iconFor[kind]} size={20} color={accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <RouteLine
            origin={post?.origin_city ?? '—'}
            destination={post && post.destination_city !== post.origin_city ? post.destination_city : undefined}
            fontSize={14}
            style={{ marginBottom: 4 }}
          />
          {scheduledAt && (
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint }}>
              {scheduledAt.toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })} · {scheduledAt.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
        {!selectionMode && <Icon name="chevron_right" size={18} color={theme.textFaint} />}
      </TouchableOpacity>
    </View>
  );
}
