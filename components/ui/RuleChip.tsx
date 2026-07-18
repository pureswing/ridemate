import { TouchableOpacity } from './TouchableOpacity';
import { ThemedText as Text } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { fonts, radii } from '@/constants/themes';

interface Props {
  active: boolean;
  onPress: () => void;
  accent: string;
  theme: ReturnType<typeof useTheme>;
  children: string;
}

// Filter/selection pill — active state fills with `accent`. Used across the
// ride post form for rules, vehicle type, comfort/climate prefs, contact
// method, visibility delay, and the oversized-item sheet.
export function RuleChip({ active, onPress, accent, theme, children }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        height: 38, paddingHorizontal: 14, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center',
        backgroundColor: active ? accent : theme.surface,
        borderWidth: 1.5, borderColor: active ? accent : theme.border,
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: active ? '#fff' : theme.textSecondary }}>{children}</Text>
    </TouchableOpacity>
  );
}
