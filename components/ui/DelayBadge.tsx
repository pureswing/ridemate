import { ThemedText as Text } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/constants/themes';

// AeroDataBox reports a delay only once revised/live data exists — most
// scheduled-only flights have no deviation to show, so this renders nothing
// rather than a misleading "on time".
export function DelayBadge({ minutes, theme }: { minutes: number | undefined; theme: ReturnType<typeof useTheme> }) {
  if (!minutes || Math.abs(minutes) < 1) return null;
  const late = minutes > 0;
  return (
    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10.5, marginTop: 2, color: late ? theme.danger : theme.success }}>
      {late ? `+${minutes}m late` : `${minutes}m early`}
    </Text>
  );
}
