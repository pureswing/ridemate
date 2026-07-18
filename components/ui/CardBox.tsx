import { View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

// Bordered container for a StepRow or a small group of them — the ride post
// form's standard "card" chrome (seats, bags, adults/children counters).
export function CardBox({ children, style }: { children: React.ReactNode; style?: object }) {
  const theme = useTheme();
  return (
    <View style={[{ backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border, borderRadius: 14, paddingHorizontal: 14 }, style]}>
      {children}
    </View>
  );
}
