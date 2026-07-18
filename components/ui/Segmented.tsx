import { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { TouchableOpacity } from './TouchableOpacity';
import { ThemedText as Text } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { fonts, radii, shadows } from '@/constants/themes';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  theme: ReturnType<typeof useTheme>;
}

// Pill segmented control for 2 short options (e.g. Offering/Looking,
// EN/ES). Matches the design system's Segmented.jsx: one shared track (not
// per-button borders) with a separate thumb that's measured against each
// button's real onLayout box and slides there — not a per-button color snap.
//
// Deliberately built on react-native's own classic Animated API, NOT
// react-native-reanimated — a position:absolute Reanimated Animated.View
// inside a ScrollView breaks touch dispatch for sibling content on Android
// under the New Architecture (unresolved upstream:
// software-mansion/react-native-reanimated#8497). react-native's own
// Animated.View doesn't have this issue. The animated properties here
// (left/width) aren't native-driver-eligible anyway, so this isn't a
// meaningful performance step down from the Reanimated version it replaced.
export function Segmented<T extends string>({ options, value, onChange, theme }: Props<T>) {
  const layouts = useRef<Record<string, { x: number; width: number }>>({});
  const thumbX = useRef(new Animated.Value(0)).current;
  const thumbWidth = useRef(new Animated.Value(0)).current;
  const thumbOpacity = useRef(new Animated.Value(0)).current;

  function handleLayout(key: string, x: number, width: number) {
    const isFirst = !layouts.current[key];
    layouts.current[key] = { x, width };
    if (key === value && isFirst) {
      thumbX.setValue(x);
      thumbWidth.setValue(width);
      thumbOpacity.setValue(1);
    }
  }

  // Drives the thumb to whichever key's measured box is passed in. Called
  // both from onPress (so the tap that changes `value` also animates in the
  // same JS tick) and from the effect (for value changes triggered from
  // outside this component, e.g. the Airport-trip ToggleRow flipping
  // `airportLeg`).
  function animateTo(key: string) {
    const l = layouts.current[key];
    if (!l) return;
    const easing = Easing.bezier(0.22, 0.61, 0.36, 1);
    Animated.timing(thumbX, { toValue: l.x, duration: 360, easing, useNativeDriver: false }).start();
    Animated.timing(thumbWidth, { toValue: l.width, duration: 360, easing, useNativeDriver: false }).start();
    Animated.timing(thumbOpacity, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  }

  useEffect(() => {
    animateTo(value);
  }, [value]);

  return (
    <View style={{ flexDirection: 'row', padding: 4, backgroundColor: theme.surfaceAlt, borderRadius: radii.pill }}>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: 4, bottom: 4, borderRadius: radii.pill, backgroundColor: theme.border },
          shadows.sm,
          { left: thumbX, width: thumbWidth, opacity: thumbOpacity },
        ]}
      />
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => { animateTo(opt.value); onChange(opt.value); }}
            onLayout={(e) => handleLayout(opt.value, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: active ? theme.text : theme.muted }}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
