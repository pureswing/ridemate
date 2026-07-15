import { useState } from 'react';
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
  // A fixed relative scale shrinks by fewer absolute pixels on a small card
  // than a large one, so the press feedback reads as barely-there on compact
  // cards (e.g. side-by-side mini-cards) — override with a smaller number
  // (more aggressive scale-down) to compensate.
  pressedScale?: number;
  // For non-default-surface cards (e.g. a dark "premium" card) — overriding
  // via `style` alone doesn't reach these because they live on the OUTER
  // (shadow) and INNER (border) views respectively, not the merged style prop.
  backgroundColor?: string;
  borderColor?: string;
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
  pressedScale = 0.985,
  backgroundColor,
  borderColor,
}: Props) {
  const theme = useTheme();
  const shadow = elevation === 'none' ? {} : shadows[elevation];
  const [pressed, setPressed] = useState(false);
  const bg = backgroundColor ?? theme.surface;
  const border = borderColor ?? theme.cardBorder;

  // overflow:'hidden' (needed to clip square-cornered content to the rounded
  // radius) clips the shadow too if it lives on the same View — split into an
  // outer View carrying the shadow (with a real backgroundColor, or Android's
  // elevation renders a shapeless blur instead of following the radius — same
  // fix as Chip/IconButton) and an inner one that clips.
  const inner = (
    <View
      style={{
        position: 'relative',
        borderRadius: radius,
        padding,
        borderWidth: 1,
        borderColor: border,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );

  // The accent stripe is a sibling of `inner`, not nested inside it — nesting
  // it meant its own borderTopLeftRadius/borderBottomLeftRadius was measured
  // against a box already inset by inner's 1px border, so the curve landed
  // slightly short of the outer shadow container's curve, leaving a sliver of
  // inner's border color visible between the accent color and the shadow.
  // As a direct sibling (same coordinate frame as the outer box, painted last
  // so it also covers inner's left border edge) the two curves align exactly.
  const accentStripe = accent && (
    <View
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: radius + 6,
        backgroundColor: 'transparent',
        borderLeftWidth: 6,
        borderLeftColor: accent,
        borderTopLeftRadius: radius,
        borderBottomLeftRadius: radius,
        overflow: 'hidden',
      }}
    />
  );

  // Pressable's own style (even a non-sizing style via its function-form) is
  // unreliable on this RN version — see Button.tsx. A plain View with a STATIC
  // style object owns background/shadow/press-scale.
  //
  // Pressable WRAPS {inner} as its parent here — NOT a sibling positioned
  // underneath. An earlier version put it as a same-level sibling so nested
  // Pressables (avatar → profile, price → analysis, etc.) could "win" a touch
  // first; that broke every plain (non-nested) tap, because a non-interactive
  // sibling painted on top of a Pressable blocks the touch outright in RN — it
  // does not transparently fall through to what's underneath. Parent/child
  // Pressable nesting is what RN actually supports: an inner Pressable claims
  // its own tap first, and only falls through to this outer one otherwise.
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius,
          transform: interactive && pressed ? [{ scale: pressedScale }] : [{ scale: 1 }],
          ...shadow,
        },
        style,
      ]}
    >
      {interactive ? (
        <Pressable
          onPress={onPress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
        >
          {inner}
        </Pressable>
      ) : (
        inner
      )}
      {accentStripe}
    </View>
  );
}
