import { Pressable } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts } from '@/constants/themes';

interface Props {
  onPress: () => void;
}

export function AuthBackButton({ onPress }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 12 }}>
      <Icon name="chevron_left" size={20} color={theme.muted} />
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: theme.muted }}>{t.auth.back}</Text>
    </Pressable>
  );
}
