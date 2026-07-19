import { StyleProp, ViewStyle } from 'react-native';
import { TouchableOpacity } from './TouchableOpacity';
import { ThemedText as Text } from './ThemedText';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';
import { IconName } from '@/constants/icons';
import { fonts, radii } from '@/constants/themes';

interface Props {
  active: boolean;
  onPress: () => void;
  accent: string;
  theme: ReturnType<typeof useTheme>;
  icon?: IconName;
  children: string;
  style?: StyleProp<ViewStyle>;
}

// Filter/selection pill — active state fills with `accent`. Used across the
// ride post form for rules, vehicle type, comfort/climate prefs, contact
// method, visibility delay, and the oversized-item sheet. `style` is an
// optional override — e.g. `flex: 1` to force a fixed set of chips onto one
// row instead of letting them wrap (see the bag-type row in app/post/ride.tsx).
export function RuleChip({ active, onPress, accent, theme, icon, children, style }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          flexDirection: 'row', alignItems: 'center', gap: 6,
          height: 38, paddingHorizontal: 14, borderRadius: radii.pill, justifyContent: 'center',
          backgroundColor: active ? accent : theme.surface,
          borderWidth: 1.5, borderColor: active ? accent : theme.border,
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={14} color={active ? '#fff' : theme.muted} />}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: active ? '#fff' : theme.textSecondary }}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}
