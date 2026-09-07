import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleProp, StyleSheet, ViewStyle, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { radii } from '@/constants/themes';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Tap-outside-to-dismiss — off for sheets that must be explicitly
  // confirmed/cancelled via their own buttons.
  dismissable?: boolean;
  // Drag handle pill at the top — on by default, matches every existing sheet.
  showHandle?: boolean;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

// Shared bottom-sheet shell. RN's built-in Modal animationType="slide"
// animates the *entire* modal subtree sliding up — including the backdrop,
// which then visibly slides in with the sheet instead of just being there.
// This drives the animation manually instead: the backdrop fades in fast
// (reads as "already on screen") while only the sheet content itself
// translates up, which is how every bottom sheet in the app should look.
export function BottomSheet({ visible, onClose, children, dismissable = true, showHandle = true, backgroundColor, style }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // A percentage maxHeight (e.g. '88%') on `style` needs resolving against
  // the actual window height ourselves — its real parent here is this
  // `Animated.View`, which has no explicit height of its own (it sizes to
  // content), and RN/Yoga's percentage resolution inside a Modal's separate
  // native root falls back to the full screen instead of erroring, giving a
  // sheet that reserves e.g. 88% of the SCREEN regardless of how short its
  // actual content is — a big blank gap below the content, filled with
  // `backgroundColor`, instead of the sheet just hugging its content like a
  // fixed-pixel maxHeight would.
  const flatStyle = StyleSheet.flatten(style) ?? {};
  const resolvedMaxHeight = typeof flatStyle.maxHeight === 'string' && flatStyle.maxHeight.endsWith('%')
    ? screenHeight * (parseFloat(flatStyle.maxHeight) / 100)
    : flatStyle.maxHeight;
  const resolvedStyle = { ...flatStyle, ...(resolvedMaxHeight !== undefined ? { maxHeight: resolvedMaxHeight } : {}) };
  const [mounted, setMounted] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: screenHeight, duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(screenHeight);
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: backdropOpacity, justifyContent: 'flex-end' }}>
        {dismissable && <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />}
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          <Pressable onPress={() => {}}>
            {/* Outer box owns the safe-area bottom inset unconditionally —
                a caller's `style` (e.g. its own paddingBottom) is applied to
                an inner wrapper instead of merged into this one, so it adds
                on top of the inset rather than clobbering it. That clobbering
                is exactly what let sheet content render underneath the
                device's own gesture-nav bar before this split existed. */}
            <Animated.View
              style={{
                position: 'relative',
                backgroundColor: backgroundColor ?? theme.surface,
                borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
                paddingBottom: insets.bottom,
              }}
            >
              {/* Fills any gap below the safe-area padding on devices where
                  useSafeAreaInsets() under-reports inside a Modal's own
                  native root (gesture-nav Android in particular). */}
              <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: -40, height: 40, backgroundColor: backgroundColor ?? theme.surface }} />
              <Animated.View style={resolvedStyle}>
                {showHandle && (
                  <Animated.View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center', marginTop: 12, marginBottom: 8 }} />
                )}
                {children}
              </Animated.View>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
