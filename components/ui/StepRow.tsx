import { View } from 'react-native';
import { TouchableOpacity } from './TouchableOpacity';
import { ThemedText as Text } from './ThemedText';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';
import { IconName } from '@/constants/icons';
import { fonts } from '@/constants/themes';

interface Props {
  icon: IconName;
  label: string;
  sub?: string;
  value: number;
  min: number;
  max: number;
  onDec: () => void;
  onInc: () => void;
  theme: ReturnType<typeof useTheme>;
}

// Icon + label/sub + -/value/+ counter row — used inside a CardBox for
// seats, adults/children, bags, vehicles needed, target temperature, etc.
export function StepRow({ icon, label, sub, value, min, max, onDec, onInc, theme }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, flexShrink: 1, minWidth: 0 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={18} color={theme.text} />
        </View>
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: theme.text }}>{label}</Text>
          {sub && <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint }}>{sub}</Text>}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Stepper theme={theme} disabled={value <= min} onPress={onDec} minus />
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 18, color: theme.text, minWidth: 16, textAlign: 'center' }}>{value}</Text>
        <Stepper theme={theme} disabled={value >= max} onPress={onInc} />
      </View>
    </View>
  );
}

export function Stepper({ onPress, disabled, minus, theme }: { onPress: () => void; disabled?: boolean; minus?: boolean; theme: ReturnType<typeof useTheme> }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={{
      width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: theme.border,
      backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1,
    }}>
      {minus
        ? <View style={{ width: 12, height: 2, borderRadius: 2, backgroundColor: theme.text }} />
        : <Icon name="add" size={15} color={theme.text} strokeWidth={2.4} />}
    </TouchableOpacity>
  );
}
