import { Modal, Image, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '@/components/ui/IconButton';
import { useTranslation } from '@/hooks/useTranslation';

const MAX_SCALE = 4;

interface Props {
  visible: boolean;
  uri: string | null | undefined;
  onClose: () => void;
}

// Full-screen pinch-to-zoom / pan viewer for the route map image shown as
// the post detail header — the same interaction as a phone's photo gallery
// or a web image lightbox. Scale/translation reset on close so reopening
// (or opening a different image) always starts fresh.
export function ZoomableImageModal({ visible, uri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const t = useTranslation();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  function reset() {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(MAX_SCALE, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value <= 1) return;
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        reset();
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const composed = Gesture.Simultaneous(Gesture.Race(doubleTap, pan), pinch);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  function handleClose() {
    reset();
    onClose();
  }

  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <GestureHandlerRootView style={styles.backdrop}>
        <GestureDetector gesture={composed}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, animatedStyle]}>
            <Image source={{ uri }} style={styles.image} resizeMode="contain" />
          </Animated.View>
        </GestureDetector>

        <IconButton
          icon="close"
          variant="glass"
          label={t.post.goBack}
          onPress={handleClose}
          style={{ position: 'absolute', top: insets.top + 8, right: 16 }}
        />
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
