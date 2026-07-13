import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { radii, spacing, shadows } from '@/constants/themes';

type Elevation = 'none' | 'sm' | 'md' | 'lg';

interface Props {
  children: React.ReactNode;
  padding?: number;
  radius?: number;
  elevation?: Elevation;
  interactive?: boolean;
  accent?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Card — white rounded surface, soft warm shadow. The base container for
// everything in the feed. Set `interactive` for a press/lift affordance.
export function Card({
  children,
  padding = spacing[5],
  radius = radii.lg,
  elevation = 'md',
  interactive = false,
  accent,
  onPress,
  style,
}: Props) {
  const theme = useTheme();
  const shadow = elevation === 'none' ? {} : shadows[elevation];

  const content = (
    <>
      {accent && (
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: accent }} />
      )}
      {children}
    </>
  );

  const baseStyle: StyleProp<ViewStyle> = [
    {
      position: 'relative',
      backgroundColor: theme.surface,
      borderRadius: radius,
      padding,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      overflow: 'hidden',
      ...shadow,
    },
    style,
  ];

  if (interactive) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...baseStyle, pressed && { transform: [{ scale: 0.985 }] }]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={baseStyle}>{content}</View>;
}
