import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { ThemedText as Text } from './ThemedText';
import { RuleChip } from './RuleChip';
import { Button } from './Button';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { OVERSIZED_ITEMS } from '@/constants/rideFormOptions';

export interface OversizedInfo {
  types: string[];
  other: string;
}

interface Props {
  value: OversizedInfo;
  onSave: (v: OversizedInfo) => void;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useTranslation>;
  accent: string;
}

// Bottom-sheet content (render inside a Modal/PickerSheet by the caller) for
// picking what kind of oversized luggage item a bag is, plus a free-text
// "something else" field.
export function OversizedSheet({ value, onSave, theme, t, accent }: Props) {
  const [types, setTypes] = useState<string[]>(value.types);
  const [other, setOther] = useState(value.other);
  function toggle(item: string) {
    setTypes((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  }
  return (
    <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 }}>
      <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 18 }} />
      <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.textFaint, marginBottom: 14 }}>
        {t.post.oversizedTitle}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {OVERSIZED_ITEMS.map((item) => (
          <RuleChip key={item} active={types.includes(item)} onPress={() => toggle(item)} accent={accent} theme={theme}>{item}</RuleChip>
        ))}
      </View>
      <View style={{ marginTop: 16 }}>
        <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: letterSpacingFor(12, tracking.wide), color: theme.text, marginBottom: 7 }}>
          {t.post.oversizedOther} <Text style={{ fontFamily: fonts.bodyRegular, textTransform: 'none', letterSpacing: 0, color: theme.textFaint }}>{t.post.oversizedOtherOptional}</Text>
        </Text>
        <View style={{ backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border, borderRadius: 14, padding: 14, ...shadows.xs }}>
          <TextInput
            value={other}
            onChangeText={setOther}
            multiline
            numberOfLines={3}
            placeholder={t.post.oversizedOtherPlaceholder}
            placeholderTextColor={theme.muted}
            style={{ fontFamily: fonts.bodyMedium, fontSize: 14.5, color: theme.text, minHeight: 60, textAlignVertical: 'top' }}
          />
        </View>
      </View>
      <Button variant="primary" size="lg" fullWidth style={{ marginTop: 18 }} onPress={() => onSave({ types, other: other.trim() })}>
        {t.post.save}
      </Button>
    </View>
  );
}
