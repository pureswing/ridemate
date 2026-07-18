import { View } from 'react-native';
import { TouchableOpacity } from './TouchableOpacity';
import { ThemedText as Text } from './ThemedText';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';
import { IconName } from '@/constants/icons';
import { fonts } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';

interface Props {
  active: boolean;
  onPress: () => void;
  icon: IconName;
  title: string;
  sub: string;
  accent: string;
  accentSoft: string;
}

// Selectable icon+title+subtitle card — the ride post form's "Trip type"
// picker (Regular vs. Event).
export function KindCard({ active, onPress, icon, title, sub, accent, accentSoft }: Props) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1, padding: 14, borderRadius: 14, gap: 10,
        backgroundColor: active ? accentSoft : theme.surface,
        borderWidth: 1.5, borderColor: active ? accent : theme.border,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? accent : theme.surfaceAlt }}>
        <Icon name={icon} size={21} color={active ? '#fff' : theme.text} strokeWidth={2.2} />
      </View>
      <View>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, letterSpacing: letterSpacingFor(17, tracking.tight), color: theme.text }}>{title}</Text>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: theme.muted, marginTop: 1 }}>{sub}</Text>
      </View>
    </TouchableOpacity>
  );
}
