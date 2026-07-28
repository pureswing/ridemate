import { Pressable } from 'react-native';
import { ThemedText as Text } from './ThemedText';
import { BottomSheet } from './BottomSheet';
import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/constants/themes';

interface Props {
  visible: boolean;
  onClose: () => void;
  doneLabel: string;
  theme: ReturnType<typeof useTheme>;
  children: React.ReactNode;
}

// Bottom-sheet chrome for iOS's inline DateTimePicker spinner, which (unlike
// Android's dialog) has no built-in dismiss. Also doubles as the oversized-
// item picker's sheet frame.
export function PickerSheet({ visible, onClose, doneLabel, theme, children }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} style={{ paddingBottom: 28 }}>
      {children}
      <Pressable onPress={onClose} style={{ marginHorizontal: 20, marginTop: 8, backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 }}>{doneLabel}</Text>
      </Pressable>
    </BottomSheet>
  );
}
