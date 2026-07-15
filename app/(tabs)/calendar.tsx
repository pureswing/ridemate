import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { radii } from '@/constants/themes';

// Placeholder — tab exists for the nav bar layout; no real calendar logic yet.
export default function CalendarScreen() {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ width: 72, height: 72, borderRadius: radii.xl, backgroundColor: theme.chipActiveBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Icon name="event" size={36} color={theme.primary} />
        </View>
        <Text style={{ color: theme.text, fontFamily: theme.fontDisplay, fontSize: 18 }}>{t.tabs.calendar}</Text>
      </View>
    </View>
  );
}
