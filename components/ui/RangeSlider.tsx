import { useRef, useState } from 'react';
import { View, PanResponder, LayoutChangeEvent } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { radii, shadows } from '@/constants/themes';

interface Props {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  accentColor?: string;
}

// Single-thumb discrete slider — no native slider dependency, matches the
// design's track+thumb look with a plain PanResponder over a measured track
// width (no external package needed for one draggable value).
export function RangeSlider({ min, max, step, value, onChange, accentColor }: Props) {
  const theme = useTheme();
  const accent = accentColor ?? theme.primary;
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  // PanResponder.create() runs once (inside the useRef initializer below), so
  // its handlers close over whatever `onChange`/min/max/step were live at
  // mount — a stale closure that silently drops any FilterDrawer state
  // changed since mount when it eventually fires patch({...}) itself.
  // Reading through a ref that's updated every render keeps it current.
  const liveRef = useRef({ onChange, min, max, step });
  liveRef.current = { onChange, min, max, step };

  function onLayout(e: LayoutChangeEvent) {
    widthRef.current = e.nativeEvent.layout.width;
    setWidth(e.nativeEvent.layout.width);
  }

  function valueFromX(x: number) {
    const w = widthRef.current;
    const { min, max, step } = liveRef.current;
    if (w <= 0) return value;
    const ratio = Math.min(1, Math.max(0, x / w));
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    return Math.min(max, Math.max(min, stepped));
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => liveRef.current.onChange(valueFromX(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => liveRef.current.onChange(valueFromX(e.nativeEvent.locationX)),
    })
  ).current;

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const thumbSize = 20;
  const thumbLeft = Math.max(0, Math.min(width - thumbSize, ratio * width - thumbSize / 2));

  return (
    <View onLayout={onLayout} style={{ height: 28, justifyContent: 'center' }} {...panResponder.panHandlers}>
      <View style={{ height: 4, borderRadius: radii.pill, backgroundColor: theme.border, overflow: 'hidden' }}>
        <View style={{ height: 4, width: `${ratio * 100}%`, backgroundColor: accent }} />
      </View>
      {width > 0 && (
        <View
          style={{
            position: 'absolute',
            left: thumbLeft,
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: '#fff',
            borderWidth: 2,
            borderColor: accent,
            ...shadows.sm,
          }}
        />
      )}
    </View>
  );
}
