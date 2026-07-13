import { View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  current: number;
  total: number;
}

// Sign-up wizard progress dots — active dot widens, upcoming ones stay a small circle.
export function StepDots({ current, total }: Props) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: i <= current ? theme.primary : theme.border,
          }}
        />
      ))}
    </View>
  );
}
