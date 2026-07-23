import { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/constants/themes';

interface Props {
  origin: string;
  // Omit for a pickup-only post (e.g. hauling with disposal:'driver', where
  // origin_city is reused as destination_city in the DB since that column
  // is NOT NULL) — renders just the origin dot, no line/arrow/second dot.
  destination?: string;
  originColor?: string;
  destColor?: string;
  style?: StyleProp<ViewStyle>;
}

// Pulsing origin/destination dot — loops indefinitely, no interaction needed.
function PulseDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 1000, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <Animated.View
      style={{ width: 11, height: 11, borderRadius: 999, backgroundColor: color, flexShrink: 0, transform: [{ scale }] }}
    />
  );
}

// RouteLine — origin → destination with two dots joined by a dashed track.
// The source design auto-drifts long routes back and forth and pulses the
// dots — a hover-less native equivalent using RN's Animated API (no touch
// needed, unlike a plain ScrollView) so it matches the original motion.
export function RouteLine({ origin, destination, originColor, destColor, style }: Props) {
  const theme = useTheme();
  const oColor = originColor ?? theme.secondary;
  const dColor = destColor ?? theme.primary;

  const [containerWidth, setContainerWidth] = useState(0);
  const [naturalWidth, setNaturalWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const overflow = Math.max(0, naturalWidth - containerWidth);

  useEffect(() => {
    if (!destination || overflow === 0) {
      translateX.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, { toValue: -overflow, duration: overflow * 25, delay: 1200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: overflow * 25, delay: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [destination, overflow, translateX]);

  const textStyle = { fontFamily: fonts.displayBold, fontSize: 17, color: theme.text, letterSpacing: -0.1, flexShrink: 0 } as const;

  if (!destination) {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 3 }, style]}>
        <PulseDot color={oColor} />
        <Text style={textStyle}>{origin}</Text>
      </View>
    );
  }

  return (
    <View
      style={[{ overflow: 'hidden' }, style]}
      onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Invisible, absolutely-positioned twin with a FIXED (not flex:1) gap
          between origin/destination — measuring the real Animated.View below is
          unreliable because its own minWidth:'100%' makes Yoga report the
          container's width back, not the content's true (possibly wider) need,
          so overflow always computed to 0 even when text was visibly clipping. */}
      <View
        style={{ position: 'absolute', opacity: 0 }}
        pointerEvents="none"
        onLayout={(e: LayoutChangeEvent) => setNaturalWidth(e.nativeEvent.layout.width)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 3 }}>
          <View style={{ width: 11, height: 11 }} />
          <Text style={textStyle}>{origin}</Text>
          <View style={{ width: 24, height: 0 }} />
          <Icon name="arrow_forward" size={16} color={theme.textFaint} />
          <View style={{ width: 11, height: 11 }} />
          <Text style={textStyle}>{destination}</Text>
        </View>
      </View>

      <Animated.View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minWidth: '100%',
          // A couple px of breathing room on each side — the pulsing dots scale
          // up past their own box, and without this the left dot's growth got
          // clipped by this container's overflow:'hidden'.
          paddingHorizontal: 3,
          transform: [{ translateX }],
        }}
      >
        <PulseDot color={oColor} />
        <Text style={textStyle}>{origin}</Text>
        <View style={{ flex: 1, minWidth: 24, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: theme.border }} />
        <Icon name="arrow_forward" size={16} color={theme.textFaint} />
        <PulseDot color={dColor} />
        <Text style={textStyle}>{destination}</Text>
      </Animated.View>
    </View>
  );
}
