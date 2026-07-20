import { View, Modal, Pressable as RNPressable, ActivityIndicator } from 'react-native';
import { ThemedText as Text } from './ThemedText';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconName } from '@/constants/icons';
import { fonts, radii } from '@/constants/themes';

interface Props {
  visible: boolean;
  tone: 'danger' | 'success';
  icon: IconName;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

// Shared bottom-sheet confirm dialog — same one used for accept/decline
// offer (app/messages/[id].tsx). Plain RN Pressable throughout, not the
// shared gesture-handler TouchableOpacity: nesting a GestureHandlerRootView
// inside a plain Modal left the whole screen's touches dead after the modal
// closed once (see project memory on the freeze bug) — Pressable sidesteps
// it entirely.
export function ConfirmSheet({ visible, tone, icon, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, busy }: Props) {
  const theme = useTheme();
  const accent = tone === 'danger' ? theme.danger : theme.driverText;
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <RNPressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={onCancel}>
        <RNPressable onPress={() => {}}>
          <View style={{
            position: 'relative',
            backgroundColor: theme.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
            padding: 24, paddingBottom: insets.bottom + 24,
          }}>
            {/* Fills any gap below the safe-area padding on devices where
                useSafeAreaInsets() under-reports inside a Modal's own native
                root (gesture-nav Android in particular). */}
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: -40, height: 40, backgroundColor: theme.surface }} />
            <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 20 }} />
            <View style={{
              width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: accent,
              backgroundColor: accent + '14', alignItems: 'center', justifyContent: 'center',
              alignSelf: 'center', marginBottom: 16,
            }}>
              <Icon name={icon} size={26} color={accent} strokeWidth={tone === 'success' ? 2.5 : 2} />
            </View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 21, color: theme.text, textAlign: 'center' }}>
              {title}
            </Text>
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              {message}
            </Text>
            <View style={{ gap: 10, marginTop: 22 }}>
              <RNPressable
                onPress={onConfirm}
                disabled={busy}
                style={{ height: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: accent, opacity: busy ? 0.6 : 1 }}
              >
                {busy ? <ActivityIndicator color="#fff" /> : (
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: '#fff' }}>{confirmLabel}</Text>
                )}
              </RNPressable>
              <RNPressable
                onPress={onCancel}
                disabled={busy}
                style={{ height: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surfaceAlt }}
              >
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: theme.text }}>{cancelLabel}</Text>
              </RNPressable>
            </View>
          </View>
        </RNPressable>
      </RNPressable>
    </Modal>
  );
}
