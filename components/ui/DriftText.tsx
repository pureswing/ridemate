import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View, StyleProp, TextStyle, LayoutChangeEvent } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';

const AnimatedText = Animated.createAnimatedComponent(Text);

interface Props {
  children: string;
  style?: StyleProp<TextStyle>;
}

// Single-line text that auto-drifts left/right when it overflows its
// container, instead of truncating (e.g. a long settings row subtitle).
// Earlier attempts at this measured natural width via a hidden
// position:'absolute' Text (the technique components/ride/RouteLine.tsx
// uses for its origin/destination row) — for a lone Text with no sibling
// icons/dots, that consistently reported the CONTAINER's width instead of
// the text's true unconstrained width, so overflow always computed to 0. A
// horizontal ScrollView's onContentSizeChange doesn't have that ambiguity —
// it's built specifically to report true content size regardless of
// viewport clipping — so it's kept here purely as an invisible measuring
// pass (opacity 0, never actually scrolled).
//
// The drift motion itself, though, used to be driven by animating that same
// ScrollView's scrollX and calling scrollTo() on every frame from JS
// (useNativeDriver: false, required since scrollTo isn't a native-driver
// property) — fine for one instance, but with several DriftTexts on screen
// at once (e.g. Settings' toggle-row subtitles), those per-frame scrollTo
// calls all compete for the JS thread/bridge. Frames get dropped for
// whichever instance loses that contention, and since the animation
// timeline advances on elapsed time regardless of which frames actually
// landed, the visible scroll position falls behind and never reaches the
// true end before the sequence's instant reset-to-0 fires — reads exactly
// like "stutters, then snaps back without finishing". Swapping to a
// transform: translateX driven with useNativeDriver: true moves the whole
// animation onto the native thread, so concurrent instances no longer
// fight over the bridge.
export function DriftText({ children, style }: Props) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const overflow = Math.max(0, contentWidth - containerWidth);

  useEffect(() => {
    if (overflow === 0) return;
    translateX.setValue(0);
    // One-directional: drift to the end, then JUMP back to the start (no
    // reverse animation) and repeat — not a back-and-forth ping-pong.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, { toValue: -overflow, duration: overflow * 25, delay: 1200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 0, delay: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [overflow, translateX]);

  return (
    <View style={{ overflow: 'hidden' }} onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        onContentSizeChange={(w) => setContentWidth(w)}
      >
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </ScrollView>
      {/* alignSelf: 'flex-start' alone isn't enough to stop this Text being
          capped at containerWidth — RN/Yoga still uses the parent's resolved
          width as the measure hint for a cross-axis 'auto' leaf, so
          numberOfLines={1} truncates the glyphs at render time (before
          translateX ever runs) and sliding it left just moves the
          already-cut text instead of revealing the rest. Forcing an explicit
          width equal to the measured contentWidth is what actually gives it
          room to render in full. */}
      <AnimatedText
        numberOfLines={1}
        style={[style, contentWidth > 0 && { width: contentWidth }, { alignSelf: 'flex-start', transform: [{ translateX }] }]}
      >
        {children}
      </AnimatedText>
    </View>
  );
}
