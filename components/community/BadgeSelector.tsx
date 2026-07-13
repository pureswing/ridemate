import { useState } from 'react';
import { View, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useTranslation } from '@/hooks/useTranslation';
import { useBadges } from '@/hooks/useBadges';
import { BadgeType, DriverBadgeType, PassengerBadgeType } from '@/types';

const DRIVER_BADGES: DriverBadgeType[] = ['clean_car', 'punctual', 'friendly', 'good_vibes', 'smooth_ride'];
const PASSENGER_BADGES: PassengerBadgeType[] = ['on_time', 'communicative', 'respectful', 'tidy', 'great_company'];

interface Props {
  visible: boolean;
  agreementId: string;
  receiverId: string;
  receiverName: string;
  // Role of the CURRENT user — determines which badge set to show
  currentRole: 'driver' | 'rider';
  onDone: () => void;
}

export function BadgeSelector({ visible, agreementId, receiverId, receiverName, currentRole, onDone }: Props) {
  const t = useTranslation();
  const { giveBadges, loading } = useBadges();
  const [selected, setSelected] = useState<Set<BadgeType>>(new Set());

  // Drivers give passenger badges; passengers give driver badges
  const badgeSet: BadgeType[] = currentRole === 'driver' ? PASSENGER_BADGES : DRIVER_BADGES;

  function toggle(badge: BadgeType) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(badge)) next.delete(badge);
      else next.add(badge);
      return next;
    });
  }

  async function handleSend() {
    try {
      await giveBadges(agreementId, receiverId, Array.from(selected));
      Alert.alert('', t.badges.sent);
      onDone();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-background px-6 pt-10 pb-12">
        <Text className="text-2xl font-bold text-text mb-1">{t.badges.title}</Text>
        <Text className="text-textSecondary mb-6">{t.badges.subtitle}</Text>

        <Text className="text-muted text-sm mb-3 uppercase tracking-widest">{receiverName}</Text>

        <View className="flex-row flex-wrap gap-3 mb-8">
          {badgeSet.map((badge) => {
            const isSelected = selected.has(badge);
            return (
              <TouchableOpacity
                key={badge}
                onPress={() => toggle(badge)}
                className={`px-4 py-3 rounded-2xl border ${isSelected ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
              >
                <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-text'}`}>
                  {t.badges[badge]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          className="bg-primary rounded-2xl py-4 items-center mb-3"
          onPress={handleSend}
          disabled={loading || selected.size === 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">{t.badges.send}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity className="items-center py-3" onPress={onDone}>
          <Text className="text-muted">{t.badges.skip}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
