import { View } from 'react-native';
import { ThemedText as Text } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';

interface Props {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  style?: object;
}

// Section label + optional right-aligned hint, wrapping a form field or
// group of fields — the ride post create/edit forms' standard section
// header (uppercase, extra-bold, tracked-out). `required` appends the
// classic red "*" instead of a separate validation-checklist callout.
export function Field({ label, hint, required, children, style }: Props) {
  const theme = useTheme();
  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: letterSpacingFor(12, tracking.wide), color: theme.text }}>
          {label}{required && <Text style={{ color: theme.danger }}> *</Text>}
        </Text>
        {hint && <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint }}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}
