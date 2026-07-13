import { View, Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useWeather } from '@/hooks/useWeather';
import { PostType } from '@/types';
import { fonts, radii } from '@/constants/themes';
import { textStyles } from '@/constants/typography';

type Layout = 'list' | 'grid';

interface Props {
  filterType: 'all' | PostType;
  onFilterChange: (v: 'all' | PostType) => void;
  onNotificationsPress?: () => void;
  onFiltersPress?: () => void;
  layout: Layout;
  onLayoutChange: (v: Layout) => void;
}

function greeting(name: string, t: any): { line1: string; line2: string; accent: string } {
  const h = new Date().getHours();
  const first = name.split(' ')[0];
  const isDay = h >= 5 && h < 21;
  const line2 = isDay ? t.header.whereToday : t.header.whereTonight;
  const accent = line2.slice(line2.lastIndexOf(' ') + 1);
  return {
    line1: `${h >= 5 && h < 12 ? t.header.morning : h < 17 ? t.header.afternoon : h < 21 ? t.header.evening : t.header.night}, ${first}`,
    line2: line2.slice(0, line2.lastIndexOf(' ') + 1),
    accent,
  };
}

// Feed header — the design system's "midnight" gradient hero resolves to the
// warm gold gradient in the single Miami Sunset theme (see welcome.tsx note).
export function HomeHeader({ filterType, onFilterChange, onNotificationsPress, onFiltersPress, layout, onLayoutChange }: Props) {
  const theme = useTheme();
  const { profile } = useAuthStore();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const weather = useWeather();
  const { line1, line2, accent } = greeting(profile?.full_name ?? t.header.you, t);

  return (
    <LinearGradient
      colors={theme.gradientGold as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top + 12, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
    >
      {/* Light icons while this gradient hero is mounted — reverts to the app
          default (dark, set in app/_layout.tsx) once it unmounts. */}
      <StatusBar style="light" />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...textStyles.eyebrow, color: theme.gold300 }}>
            {line1}
          </Text>
          {/* Sibling Texts in a row, not nested spans — RN's transform (used below
              to fake italic) doesn't reliably apply to a Text nested inside
              another Text on Android, only to a standalone Text view. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', marginTop: 4 }}>
            <Text style={{ ...textStyles.h2, color: theme.cream }}>
              {line2}
            </Text>
            {/* No italic cut of Bricolage Grotesque exists (not even on Google
                Fonts) — the web preview lets the browser synthesize the slant,
                but Android refuses to fake italic for a custom font and falls
                back to the system font instead. Skew the real bold glyph instead. */}
            <Text style={{ ...textStyles.h2, color: theme.gold300, transform: [{ skewX: '-10deg' }] }}>
              {accent}
            </Text>
          </View>
          {/* Fixed height, always rendered — weather resolves async (GPS fix,
              geocoding, fetch) a couple seconds after mount, and conditionally
              rendering this row made the header visibly grow/jump once it did. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, height: 16 }}>
            {weather ? (
              <>
                <Icon name={weather.icon} size={13} color="rgba(255,255,255,0.85)" />
                <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }}>
                  {weather.temp}°F · {t.header.weatherLabels[weather.labelKey]}{weather.city ? ` ${t.header.weatherIn} ${weather.city}` : ''}
                </Text>
              </>
            ) : (
              <View style={{ width: 120, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.18)' }} />
            )}
          </View>
        </View>
        <IconButton icon="notification" variant="glass" label={t.header.notifications} onPress={onNotificationsPress} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        {/* Opens the advanced filter drawer — not built yet, so this is inert for now. */}
        <IconButton icon="sliders" size="sm" variant="glass" label={t.header.filters} onPress={onFiltersPress} />
        <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
          <Chip size="sm" selected={filterType === 'all'} color={theme.gradientJade} onPress={() => onFilterChange('all')}>{t.feed.chipAll}</Chip>
          <Chip size="sm" selected={filterType === 'offer'} color={theme.gradientJade} onPress={() => onFilterChange('offer')}>{t.feed.chipPooling}</Chip>
          <Chip size="sm" selected={filterType === 'request'} color={theme.gradientJade} onPress={() => onFilterChange('request')}>{t.feed.chipRide}</Chip>
        </View>
        <View style={{ flexDirection: 'row', gap: 3, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radii.md, padding: 3 }}>
          {(['list', 'grid'] as const).map((id) => {
            const active = layout === id;
            return (
              // Static-style View for sizing/background, Pressable only as a touch
              // overlay — see components/ui/Button.tsx for why sizing can't live
              // directly on a Pressable's own style in this RN version.
              <View key={id} style={{ width: 30, height: 28, borderRadius: radii.sm, backgroundColor: active ? theme.secondary : theme.surface }}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={id === 'list' ? 'layout_list' : 'layout_grid'} size={15} color={active ? '#fff' : theme.text} />
                </View>
                <Pressable
                  onPress={() => onLayoutChange(id)}
                  accessibilityLabel={id === 'list' ? t.header.listView : t.header.gridView}
                  style={StyleSheet.absoluteFillObject}
                />
              </View>
            );
          })}
        </View>
      </View>
    </LinearGradient>
  );
}
