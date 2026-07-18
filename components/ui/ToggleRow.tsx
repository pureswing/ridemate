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
  checked: boolean;
  onChange: (v: boolean) => void;
  theme: ReturnType<typeof useTheme>;
}

// Icon + label/sub row with a trailing switch — the ride post form's
// "Airport trip" toggle.
export function ToggleRow({ icon, label, sub, checked, onChange, theme }: Props) {
  return (
    <TouchableOpacity onPress={() => onChange(!checked)} style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: theme.surface, borderWidth: 1.5, borderColor: checked ? theme.borderGold : theme.border,
      borderRadius: 14, padding: 14,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, flexShrink: 1, minWidth: 0 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={18} color={checked ? theme.accent : theme.muted} />
        </View>
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: theme.text }}>{label}</Text>
          {sub && <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint }}>{sub}</Text>}
        </View>
      </View>
      <View style={{ width: 38, height: 22, borderRadius: 11, backgroundColor: checked ? theme.primary : theme.border, justifyContent: 'center' }}>
        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', marginLeft: checked ? 18 : 2 }} />
      </View>
    </TouchableOpacity>
  );
}
