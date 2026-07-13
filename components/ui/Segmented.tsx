import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleProp, ViewStyle } from 'react-native';
import { ThemedText as Text } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { radii, fonts, shadows } from '@/constants/themes';

interface Option { value: string; label: string }
type Size = 'sm' | 'md';

interface Props {
  options: (Option | string)[];
  value: string;
  onChange?: (value: string) => void;
  size?: Size;
  style?: StyleProp<ViewStyle>;
}

// Segmented — pill segmented control for 2–3 short options (e.g. EN / ES).
// The active thumb is measured against each button's real rendered box (via
// onLayout) so it hugs the label correctly even when options differ in length.
export function Segmented({ options, value, onChange, size = 'md', style }: Props) {
  const theme = useTheme();
  const opts: Option[] = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const h = size === 'sm' ? 34 : 42;
  const activeIndex = Math.max(0, opts.findIndex((o) => o.value === value));

  const layouts = useRef<{ x: number; width: number }[]>([]);
  const left = useRef(new Animated.Value(4)).current;
  const width = useRef(new Animated.Value(0)).current;
  const [measured, setMeasured] = useState(false);

  const moveThumb = useCallback((index: number, animate: boolean) => {
    const l = layouts.current[index];
    if (!l) return;
    if (animate) {
      Animated.spring(left, { toValue: l.x, useNativeDriver: false, bounciness: 4 }).start();
      Animated.spring(width, { toValue: l.width, useNativeDriver: false, bounciness: 4 }).start();
    } else {
      left.setValue(l.x);
      width.setValue(l.width);
    }
  }, [left, width]);

  useEffect(() => {
    if (measured) moveThumb(activeIndex, true);
  }, [activeIndex, measured, moveThumb]);

  function handleLayout(index: number, e: LayoutChangeEvent) {
    layouts.current[index] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width };
    if (index === activeIndex && !measured && layouts.current[index]) {
      moveThumb(index, false);
      setMeasured(true);
    }
  }

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignSelf: 'flex-start',
          alignItems: 'center',
          padding: 4,
          backgroundColor: theme.surfaceAlt,
          borderRadius: radii.pill,
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left,
          width,
          opacity: measured ? 1 : 0,
          backgroundColor: theme.border,
          borderRadius: radii.pill,
          ...shadows.sm,
        }}
      />
      {opts.map((o, i) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onLayout={(e) => handleLayout(i, e)}
            onPress={() => onChange?.(o.value)}
            style={{
              height: h,
              paddingHorizontal: 18,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodyBold,
                fontSize: size === 'sm' ? 14 : 16,
                letterSpacing: -0.14,
                color: active ? theme.text : theme.muted,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}
