import { useState } from 'react';
import { View } from 'react-native';
import { TouchableOpacity } from './TouchableOpacity';
import { ThemedText as Text } from './ThemedText';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';

interface Props {
  label: string;
  hint?: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
  style?: object;
}

// Same header styling as Field, but the label row is tappable and hides its
// content behind a chevron — collapsed by default. Used for the ride post
// form's longer, optional preference sections (Comfort, Climate,
// Accessibility, Ride atmosphere, Cleanliness, Pet transportation, Pickup
// preferences) so the form doesn't read as a wall of chips by default.
export function CollapsibleField({ label, hint, defaultCollapsed = true, children, style }: Props) {
  const theme = useTheme();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <View style={style}>
      <TouchableOpacity
        onPress={() => setCollapsed((c) => !c)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexShrink: 1 }}>
          <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: letterSpacingFor(12, tracking.wide), color: theme.text }}>
            {label}
          </Text>
          {hint && <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint }}>{hint}</Text>}
        </View>
        <Icon name={collapsed ? 'chevron_down' : 'chevron_up'} size={18} color={theme.muted} />
      </TouchableOpacity>
      {!collapsed && <View style={{ marginTop: 8 }}>{children}</View>}
    </View>
  );
}
