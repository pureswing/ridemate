import { StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

interface Props {
  onPress?: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  disabled?: boolean;
  activeOpacity?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

// Drop-in react-native TouchableOpacity replacement built on
// react-native-gesture-handler's Pressable — react-native's own
// TouchableOpacity/Pressable go unresponsive below the fold in a ScrollView
// that also has a Reanimated-animated sibling (e.g. Segmented) until a
// scroll forces a relayout, a known New Architecture/Fabric touch-dispatch
// bug (facebook/react-native#47740, software-mansion/react-native-gesture-
// handler#3227). Not built on gesture-handler's own TouchableOpacity — that
// one is being deprecated and has its own flex/position:absolute layout
// quirks — Pressable is the actively-maintained recommendation, with the
// activeOpacity dimming reimplemented manually here since Pressable doesn't
// do it automatically like TouchableOpacity does.
export function TouchableOpacity({ style, activeOpacity = 0.7, disabled, onPress, onLayout, children }: Props) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onLayout={onLayout}
      style={({ pressed }: { pressed: boolean }) => [
        style,
        pressed && !disabled ? { opacity: activeOpacity } : null,
      ]}
    >
      {children}
    </Pressable>
  );
}
