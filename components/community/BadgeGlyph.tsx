import { View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { BadgeType } from '@/types';

interface Props {
  badge: BadgeType;
  size?: number;
  color: string;
}

// Every completion badge shares the same outline Shield frame — only the
// icon centered inside it changes per badge type (constants/icons.ts maps
// each BadgeType to its inner icon). Ratios match
// components/ride/CommunityBadge.jsx's Medallion exactly: inner icon at
// 48% of the shield's size, nudged down 4% from the geometric center
// (the shield's own icon glyph already tapers to a point at the bottom,
// so a true center looks slightly high without this offset).
export function BadgeGlyph({ badge, size = 50, color }: Props) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="shield" size={size} color={color} strokeWidth={1.75} />
      {/* No top/left set — an absolutely positioned child with neither still
          gets centered by the parent's alignItems/justifyContent in RN, so
          marginTop nudges it down from that centered position rather than
          pinning it from the container's top edge (which `top` would do). */}
      <View style={{ position: 'absolute', marginTop: size * 0.04 }}>
        <Icon name={badge} size={size * 0.48} color={color} strokeWidth={2} />
      </View>
    </View>
  );
}
