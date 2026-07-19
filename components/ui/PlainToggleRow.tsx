import { View } from 'react-native';
import { TouchableOpacity } from './TouchableOpacity';
import { ThemedText as Text } from './ThemedText';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';
import { IconName } from '@/constants/icons';
import { fonts } from '@/constants/themes';

interface Props {
  icon?: IconName;
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent: string;
  theme: ReturnType<typeof useTheme>;
}

// Icon (optional) + label/sub + trailing switch, no border of its own — meant
// to sit inside a CardBox with a 1px divider between rows (see the
// "Special handling" pattern in app/post/package.tsx). Shared so ride's
// preference sections don't grow another local copy of this.
export function PlainToggleRow({ icon, label, sub, checked, onChange, accent, theme }: Props) {
  return (
    <TouchableOpacity onPress={() => onChange(!checked)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, flexShrink: 1, minWidth: 0 }}>
        {icon && (
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={18} color={theme.text} />
          </View>
        )}
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: theme.text }}>{label}</Text>
          {sub && <Text numberOfLines={1} style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint }}>{sub}</Text>}
        </View>
      </View>
      <View style={{ width: 38, height: 22, borderRadius: 11, backgroundColor: checked ? accent : theme.border, justifyContent: 'center' }}>
        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', marginLeft: checked ? 18 : 2 }} />
      </View>
    </TouchableOpacity>
  );
}
