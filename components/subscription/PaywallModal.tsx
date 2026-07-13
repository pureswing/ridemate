import { View, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PaywallModal({ visible, onClose }: Props) {
  const t = useTranslation();

  const PLANS = [
    {
      id: 'monthly',
      label: t.paywall.monthly,
      price: '$2.99',
      period: '/mo',
      description: t.paywall.monthlyDesc,
      highlight: false,
    },
    {
      id: 'annual',
      label: t.paywall.annual,
      price: '$19.99',
      period: '/yr',
      description: t.paywall.annualDesc,
      highlight: true,
    },
    {
      id: 'donation',
      label: t.paywall.donation,
      price: '🙏',
      period: '',
      description: t.paywall.donationDesc,
      highlight: false,
    },
  ];

  function handleSelect(planId: string) {
    Alert.alert(
      t.paywall.comingSoonTitle,
      t.paywall.comingSoonMsg,
      [{ text: t.paywall.understood, onPress: onClose }]
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-background">
        <View className="px-6 pt-8 pb-4 border-b border-border">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-text">{t.paywall.title}</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <Text className="text-muted text-lg">✕</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-textSecondary mt-2">{t.paywall.subtitle}</Text>
        </View>

        <ScrollView className="flex-1 px-6 pt-6">
          <View className="mb-6">
            {t.paywall.benefits.map((b, i) => (
              <Text key={i} className="text-textSecondary mb-2 leading-5">
                {b}
              </Text>
            ))}
          </View>

          <Text className="font-bold text-text mb-3">{t.paywall.choosePlan}</Text>
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              className={`rounded-2xl border p-4 mb-3 ${
                plan.highlight
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-surface'
              }`}
              onPress={() => handleSelect(plan.id)}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="font-bold text-text">{plan.label}</Text>
                    {plan.highlight && (
                      <View className="bg-primary px-2 py-0.5 rounded-full">
                        <Text className="text-white text-xs font-bold">{t.paywall.popular}</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-textSecondary text-sm mt-0.5">
                    {plan.description}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-bold text-primary text-lg">{plan.price}</Text>
                  {plan.period ? (
                    <Text className="text-muted text-xs">{plan.period}</Text>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <Text className="text-muted text-xs text-center mt-4 mb-8 leading-5">
            {t.paywall.footer}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}
