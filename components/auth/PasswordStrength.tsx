import { View } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts } from '@/constants/themes';

interface Props {
  password: string;
}

function scoreOf(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

// Password strength meter — 4 segments, gold→jade as it improves.
export function PasswordStrength({ password }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  if (!password) return null;

  const score = scoreOf(password);
  const labels = [t.auth.passwordStrength.tooShort, t.auth.passwordStrength.weak, t.auth.passwordStrength.fair, t.auth.passwordStrength.strong, t.auth.passwordStrength.veryStrong];
  const colors = [theme.danger, theme.danger, theme.accent, theme.secondary, theme.secondary];

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{ flex: 1, height: 3, borderRadius: 999, backgroundColor: i < score ? colors[score] : theme.border }}
          />
        ))}
      </View>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors[score] }}>{labels[score]}</Text>
    </View>
  );
}
