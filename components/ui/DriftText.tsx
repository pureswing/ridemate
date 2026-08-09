import { useEffect, useRef, useState } from 'react';
import { ScrollView, Animated, StyleProp, TextStyle, LayoutChangeEvent } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';

interface Props {
  children: string;
  style?: StyleProp<TextStyle>;
}

// Single-line text that auto-drifts left/right when it overflows its
// container, instead of truncating (e.g. a long notification title).
// Earlier attempts at this measured natural width via a hidden
// position:'absolute' Text (the technique components/ride/RouteLine.tsx
// uses for its origin/destination row) — for a lone Text with no sibling
// icons/dots, that consistently reported the CONTAINER's width instead of
// the text's true unconstrained width, so overflow always computed to 0. A
// horizontal ScrollView's onContentSizeChange doesn't have that ambiguity —
// it's built specifically to report true content size regardless of
// viewport clipping — so it drives the "does this need to scroll" check,
// while an Animated scrollX value still drives the actual drift motion.
export function DriftText({ children, style }: Props) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const overflow = Math.max(0, contentWidth - containerWidth);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || overflow === 0) return;
    const id = scrollX.addListener(({ value }) => el.scrollTo({ x: value, animated: false }));
    // One-directional: drift to the end, then JUMP back to the start (no
    // reverse animation) and repeat — not a back-and-forth ping-pong.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scrollX, { toValue: overflow, duration: overflow * 25, delay: 1200, useNativeDriver: false }),
        Animated.timing(scrollX, { toValue: 0, duration: 0, delay: 600, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => { loop.stop(); scrollX.removeListener(id); };
  }, [overflow, scrollX]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}
      onContentSizeChange={(w) => setContentWidth(w)}
    >
      <Text style={style}>{children}</Text>
    </ScrollView>
  );
}
