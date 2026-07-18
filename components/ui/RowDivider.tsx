import { View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

// Hairline divider between StepRows inside the same CardBox.
export function RowDivider({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return <View style={{ height: 1, backgroundColor: theme.cardBorder }} />;
}
