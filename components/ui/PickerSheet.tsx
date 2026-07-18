import { Modal, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TouchableOpacity } from './TouchableOpacity';
import { ThemedText as Text } from './ThemedText';
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 28 }}>
            <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center', marginVertical: 12 }} />
            {children}
            <TouchableOpacity onPress={onClose} style={{ marginHorizontal: 20, marginTop: 8, backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 }}>{doneLabel}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </GestureHandlerRootView>
    </Modal>
  );
}
