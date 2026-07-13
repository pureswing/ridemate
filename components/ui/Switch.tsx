import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { radii, shadows } from '@/constants/themes';

type Size = 'sm' | 'md';

interface Props {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: Size;
  style?: StyleProp<ViewStyle>;
}

const DIMS: Record<Size, { w: number; h: number; knob: number }> = {
  sm: { w: 40, h: 24, knob: 18 },
  md: { w: 50, h: 30, knob: 24 },
};

// Switch — boolean toggle. Primary color when on.
export function Switch({ checked = false, onChange, disabled = false, size = 'md', style }: Props) {
  const theme = useTheme();
  const d = DIMS[size];
  const pad = (d.h - d.knob) / 2;
  const progress = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: checked ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [checked, progress]);

  const left = progress.interpolate({ inputRange: [0, 1], outputRange: [pad, d.w - d.knob - pad] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange?.(!checked)}
      style={[
        {
          width: d.w,
          height: d.h,
          borderRadius: radii.pill,
          backgroundColor: checked ? theme.primary : theme.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: pad,
          left,
          width: d.knob,
          height: d.knob,
          borderRadius: d.knob / 2,
          backgroundColor: '#fff',
          ...shadows.sm,
        }}
      />
    </Pressable>
  );
}
