import { View, Pressable as RNPressable } from 'react-native';
import { ThemedText as Text } from './ThemedText';
import { Icon } from './Icon';
import { BottomSheet } from './BottomSheet';
import { useTheme } from '@/hooks/useTheme';
import { IconName } from '@/constants/icons';
import { fonts, radii } from '@/constants/themes';

interface Props {
  visible: boolean;
  tone?: 'info' | 'danger';
  icon: IconName;
  title: string;
  message: string;
  confirmLabel: string;
  onClose: () => void;
}

// Single-button bottom-sheet — the app's replacement for a plain, unstyled
// Alert.alert(title, message) when there's nothing to confirm/cancel, just
// something to acknowledge. Same shell/Pressable choice as ConfirmSheet
// (plain RN Pressable, not the gesture-handler TouchableOpacity — see that
// file's comment on the Modal freeze bug this avoids).
export function InfoSheet({ visible, tone = 'info', icon, title, message, confirmLabel, onClose }: Props) {
  const theme = useTheme();
  const accent = tone === 'danger' ? theme.danger : theme.accent;
  return (
    <BottomSheet visible={visible} onClose={onClose} style={{ paddingHorizontal: 24, paddingTop: 4 }}>
      <View style={{
        width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: accent,
        backgroundColor: accent + '14', alignItems: 'center', justifyContent: 'center',
        alignSelf: 'center', marginBottom: 16,
      }}>
        <Icon name={icon} size={26} color={accent} />
      </View>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 21, color: theme.text, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
        {message}
      </Text>
      <View style={{ marginTop: 22, paddingBottom: 24 }}>
        <RNPressable
          onPress={onClose}
          style={{ height: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: accent }}
        >
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: '#fff' }}>{confirmLabel}</Text>
        </RNPressable>
      </View>
    </BottomSheet>
  );
}
