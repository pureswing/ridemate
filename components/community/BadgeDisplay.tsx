import { View } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useTranslation } from '@/hooks/useTranslation';
import { BadgeCount, StrikeLevel } from '@/types';

interface Props {
  badges: BadgeCount[];
  strikeLevel: StrikeLevel;
}

export function BadgeDisplay({ badges, strikeLevel }: Props) {
  const t = useTranslation();

  const strikeInfo: Record<StrikeLevel, { label: string; color: string } | null> = {
    0: null,
    1: { label: t.strikes.level1, color: 'text-warning border-warning bg-warning/10' },
    2: { label: t.strikes.level2, color: 'text-orange-500 border-orange-400 bg-orange-500/10' },
    3: { label: t.strikes.level3, color: 'text-danger border-danger bg-danger/10' },
  };

  const strike = strikeInfo[strikeLevel];

  return (
    <View>
      {/* Strike indicator */}
      {strike && (
        <View className={`rounded-xl border px-4 py-3 mb-4 ${strike.color}`}>
          <Text className={`font-semibold text-sm ${strike.color.split(' ')[0]}`}>
            {strike.label}
          </Text>
        </View>
      )}

      {/* Badge chips */}
      {badges.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {badges.map((b) => (
            <View key={b.badge_type} className="flex-row items-center bg-surface border border-border rounded-full px-3 py-1.5 gap-1">
              <Text className="text-text text-sm">{t.badges[b.badge_type as keyof typeof t.badges]}</Text>
              <View className="bg-primary rounded-full w-5 h-5 items-center justify-center ml-1">
                <Text className="text-white text-xs font-bold">{b.count}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
