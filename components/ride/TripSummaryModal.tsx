import { View, Modal, TouchableOpacity, Share, ScrollView } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { BadgeGlyph } from '@/components/community/BadgeGlyph';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { TripRecord } from '@/types';
import { BADGE_ICONS } from '@/constants/badgeIcons';

interface Props {
  visible: boolean;
  record: TripRecord | null;
  onClose: () => void;
}

export function TripSummaryModal({ visible, record, onClose }: Props) {
  const t = useTranslation();
  const theme = useTheme();

  if (!record) return null;

  // Re-bind after null guard so closures capture the narrowed type
  const r = record;
  const dateObj = new Date(r.scheduledAt);
  const dateStr = dateObj.toLocaleDateString(t.locale, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = dateObj.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' });
  const roleLabel = r.myRole === 'driver' ? t.tripSummary.driver : t.tripSummary.rider;
  // What "the quantity" line means shifts with the kind — passengers for a
  // ride, packages for a delivery, load size for hauling.
  const quantityLabel = r.kind === 'package' ? t.tripSummary.packages
    : r.kind === 'hauling' ? t.tripSummary.load
    : t.tripSummary.passengers;
  const quantityValue = r.kind === 'package' ? (r.packageQty != null ? String(r.packageQty) : undefined)
    : r.kind === 'hauling' ? r.loadSize
    : (r.passengerCount != null ? String(r.passengerCount) : undefined);
  const luggageValue = r.luggagePresent == null ? undefined
    : r.luggagePresent
      ? (r.luggageCount != null ? `${t.tripSummary.yes} (${r.luggageCount})` : t.tripSummary.yes)
      : t.tripSummary.no;

  async function handleShare() {
    const lines = [
      `=== ${t.tripSummary.title} ===`,
      r.originAddress ? `${t.tripSummary.pickupAddress}: ${r.originAddress}` : '',
      r.destinationAddress ? `${t.tripSummary.dropoffAddress}: ${r.destinationAddress}` : '',
      r.stops && r.stops.length > 0 ? `${t.tripSummary.stops}: ${r.stops.join(' · ')}` : '',
      `${t.tripSummary.date}: ${dateStr}`,
      `${t.tripSummary.time}: ${timeStr}`,
      r.distanceText ? `${t.tripSummary.distance}: ${r.distanceText}` : '',
      r.durationText ? `${t.tripSummary.duration}: ${r.durationText}` : '',
      r.suggestedDonation ? `${t.tripSummary.contribution}: $${r.suggestedDonation} USD` : '',
      `${t.tripSummary.myRole}: ${roleLabel}`,
      `${t.tripSummary.otherParty}: ${r.otherPartyName}`,
      quantityValue ? `${quantityLabel}: ${quantityValue}` : '',
      luggageValue ? `${t.tripSummary.luggage}: ${luggageValue}` : '',
      r.vehicle ? `${t.tripSummary.vehicle}: ${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model} (${r.vehicle.color}) — ${r.vehicle.insured ? t.tripSummary.insured : t.tripSummary.notInsured}` : '',
      r.badges && r.badges.length > 0 ? `${t.tripSummary.badgesEarned}: ${r.badges.map((b) => t.badges[b]).join(', ')}` : '',
      '',
      t.tripSummary.disclaimer,
    ].filter(Boolean).join('\n');

    await Share.share({ message: lines });
  }

  const btnTextColor = '#fff';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ padding: 24, paddingBottom: 48 }}>
          {/* Header */}
          <Text style={{ fontSize: 24, color: theme.text, fontFamily: theme.fontDisplay, marginBottom: 4 }}>
            {t.tripSummary.title}
          </Text>
          <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 24 }}>
            {t.tripSummary.subtitle}
          </Text>

          {/* Record card */}
          <View style={{
            backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
            borderRadius: 16, padding: 20, marginBottom: 20,
          }}>
            {r.originAddress && (
              <RecordRow label={t.tripSummary.pickupAddress} value={r.originAddress} theme={theme} />
            )}
            {r.destinationAddress && r.destination !== r.origin && (
              <RecordRow label={t.tripSummary.dropoffAddress} value={r.destinationAddress} theme={theme} />
            )}
            {r.stops && r.stops.length > 0 && (
              <RecordRow label={t.tripSummary.stops} value={r.stops.join(' · ')} theme={theme} />
            )}
            <RecordRow label={t.tripSummary.date} value={dateStr} theme={theme} />
            <RecordRow label={t.tripSummary.time} value={timeStr} theme={theme} />
            {r.distanceText && (
              <RecordRow label={t.tripSummary.distance} value={r.distanceText} theme={theme} />
            )}
            {r.durationText && (
              <RecordRow label={t.tripSummary.duration} value={r.durationText} theme={theme} />
            )}
            {r.suggestedDonation ? (
              <RecordRow label={t.tripSummary.contribution} value={`$${r.suggestedDonation} USD`} theme={theme} />
            ) : null}
            <RecordRow label={t.tripSummary.myRole} value={roleLabel} theme={theme} />
            <RecordRow label={t.tripSummary.otherParty} value={r.otherPartyName} theme={theme} />
            {quantityValue && (
              <RecordRow label={quantityLabel} value={quantityValue} theme={theme} />
            )}
            {luggageValue && (
              <RecordRow label={t.tripSummary.luggage} value={luggageValue} theme={theme} last={!r.vehicle} />
            )}
            {r.vehicle && (
              <RecordRow
                label={t.tripSummary.vehicle}
                value={`${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model} · ${r.vehicle.color} · ${r.vehicle.insured ? t.tripSummary.insured : t.tripSummary.notInsured}`}
                theme={theme}
                last
              />
            )}
          </View>

          {/* Badges earned */}
          {r.badges && r.badges.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontFamily: theme.fontDisplay, fontSize: 15, color: theme.text, marginBottom: 10 }}>
                {t.tripSummary.badgesEarned}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {r.badges.map((b) => (
                  <View key={b} style={{ alignItems: 'center', width: 60 }}>
                    <BadgeGlyph badge={b} size={44} color={BADGE_ICONS[b].color} />
                    <Text numberOfLines={2} style={{ fontSize: 10, textAlign: 'center', color: theme.muted, marginTop: 3, lineHeight: 12 }}>
                      {t.badges[b]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Disclaimer */}
          <View style={{
            backgroundColor: theme.warning + '18', borderWidth: 1,
            borderColor: theme.warning + '40', borderRadius: 12,
            padding: 14, marginBottom: 24,
          }}>
            <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>
              {t.tripSummary.disclaimer}
            </Text>
          </View>

          {/* Share */}
          <TouchableOpacity
            onPress={handleShare}
            style={{
              backgroundColor: theme.primary, borderRadius: 16,
              paddingVertical: 16, alignItems: 'center', marginBottom: 12,
            }}
          >
            <Text style={{ color: btnTextColor, fontFamily: theme.fontDisplay, fontSize: 16 }}>
              {t.tripSummary.shareBtn}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={{ borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ color: theme.muted, fontSize: 15 }}>{t.tripSummary.close}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

function RecordRow({
  label, value, theme, last = false,
}: { label: string; value: string; theme: any; last?: boolean }) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingVertical: 9,
      borderBottomWidth: last ? 0 : 1,
      borderBottomColor: theme.border,
    }}>
      <Text style={{ color: theme.muted, fontSize: 13, flexShrink: 0, marginRight: 8 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 13, fontFamily: theme.fontDisplay, flex: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}
