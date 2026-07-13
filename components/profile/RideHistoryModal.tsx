import { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { useRideHistory } from '@/hooks/useRideHistory';
import { TripSummaryModal } from '@/components/ride/TripSummaryModal';
import { Icon } from '@/components/ui/Icon';
import { RideAgreement, TripRecord } from '@/types';

interface Props {
  visible: boolean;
  userId: string;
  onClose: () => void;
}

export function RideHistoryModal({ visible, userId, onClose }: Props) {
  const t = useTranslation();
  const theme = useTheme();
  const { getCompletedRides, loading } = useRideHistory();

  const [rides, setRides] = useState<RideAgreement[]>([]);
  const [tripRecord, setTripRecord] = useState<TripRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (visible && !loaded) {
      getCompletedRides(userId).then(data => {
        setRides(data);
        setLoaded(true);
      }).catch(() => setLoaded(true));
    }
  }, [visible]);

  function openRecord(agreement: RideAgreement) {
    const isDriver = agreement.driver_id === userId;
    const post = agreement.post as any;
    setTripRecord({
      agreementId: agreement.id,
      origin: post?.origin_city ?? '—',
      destination: post?.destination_city ?? '—',
      scheduledAt: post?.scheduled_at ?? '',
      suggestedDonation: post?.suggested_donation,
      otherPartyName: isDriver
        ? (agreement.rider as any)?.full_name ?? '—'
        : (agreement.driver as any)?.full_name ?? '—',
      myRole: isDriver ? 'driver' : 'rider',
    });
  }

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
            borderBottomWidth: 1, borderBottomColor: theme.border,
          }}>
            <Text style={{ fontSize: 20, color: theme.text, fontFamily: theme.fontDisplay }}>
              {t.profile.rideHistorySection}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Icon name="close" size={22} color={theme.muted} />
            </TouchableOpacity>
          </View>

          {loading && !loaded ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />
          ) : (
            <FlatList
              data={rides}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 20, flexGrow: 1 }}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              ListEmptyComponent={
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                  <Icon name="history" size={48} color={theme.border} />
                  <Text style={{ color: theme.muted, marginTop: 16, fontSize: 15 }}>
                    {t.profile.noRideHistory}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const post = item.post as any;
                const isDriver = item.driver_id === userId;
                const date = post?.scheduled_at ? new Date(post.scheduled_at) : null;
                return (
                  <TouchableOpacity
                    onPress={() => openRecord(item)}
                    style={{
                      backgroundColor: theme.surface,
                      borderWidth: 1, borderColor: theme.border,
                      borderRadius: 14, padding: 16,
                      flexDirection: 'row', alignItems: 'center', gap: 14,
                    }}
                  >
                    <View style={{
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: isDriver ? theme.offer + '20' : theme.request + '20',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon
                        name={isDriver ? 'car' : 'passenger'}
                        size={20}
                        color={isDriver ? theme.offer : theme.request}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontFamily: theme.fontDisplay, fontSize: 14 }}>
                        {post?.origin_city ?? '?'} → {post?.destination_city ?? '?'}
                      </Text>
                      {date && (
                        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>
                          {date.toLocaleDateString(t.locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      )}
                    </View>
                    <Icon name="chevron_right" size={18} color={theme.muted} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </Modal>

      <TripSummaryModal
        visible={!!tripRecord}
        record={tripRecord}
        onClose={() => setTripRecord(null)}
      />
    </>
  );
}
