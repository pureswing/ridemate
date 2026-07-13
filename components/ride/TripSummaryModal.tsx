import { View, Modal, TouchableOpacity, Share, ScrollView } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { TripRecord } from '@/types';

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

  async function handleShare() {
    const lines = [
      `=== ${t.tripSummary.title} ===`,
      `${t.tripSummary.origin}: ${r.origin}`,
      `${t.tripSummary.destination}: ${r.destination}`,
      `${t.tripSummary.date}: ${dateStr}`,
      `${t.tripSummary.time}: ${timeStr}`,
      r.distanceText ? `${t.tripSummary.distance}: ${r.distanceText}` : '',
      r.durationText ? `${t.tripSummary.duration}: ${r.durationText}` : '',
      r.suggestedDonation ? `${t.tripSummary.contribution}: $${r.suggestedDonation} USD` : '',
      `${t.tripSummary.myRole}: ${roleLabel}`,
      `${t.tripSummary.otherParty}: ${r.otherPartyName}`,
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
            <RecordRow label={t.tripSummary.origin} value={r.origin} theme={theme} />
            <RecordRow label={t.tripSummary.destination} value={r.destination} theme={theme} />
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
            <RecordRow label={t.tripSummary.otherParty} value={record.otherPartyName} theme={theme} last />
          </View>

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
