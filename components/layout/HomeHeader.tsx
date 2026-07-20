import { useState, useCallback } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useWeather } from '@/hooks/useWeather';
import { useNotifications } from '@/hooks/useNotifications';
import { PostType } from '@/types';
import { fonts, shadows } from '@/constants/themes';
import { textStyles, leading } from '@/constants/typography';

type Layout = 'list' | 'grid';

interface Props {
  filterType: 'all' | PostType;
  onFilterChange: (v: 'all' | PostType) => void;
  onNotificationsPress?: () => void;
  onFiltersPress?: () => void;
  layout: Layout;
  onLayoutChange: (v: Layout) => void;
  resultsCount: number;
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
export function HomeHeader({ filterType, onFilterChange, onNotificationsPress, onFiltersPress, layout, onLayoutChange, resultsCount }: Props) {
  const theme = useTheme();
  const { profile, session } = useAuthStore();
  const { getUnreadCount } = useNotifications();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const weather = useWeather();
  const { line1, line2, accent } = greeting(profile?.full_name ?? t.header.you, t);
  const [unread, setUnread] = useState(0);

  // Refetches every time this screen regains focus — e.g. right after
  // coming back from the notifications screen, which marks everything read.
  useFocusEffect(
    useCallback(() => {
      if (session?.user) getUnreadCount(session.user.id).then(setUnread).catch(() => {});
    }, [session?.user?.id])
  );

  return (
    <LinearGradient
      colors={theme.gradientGold as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top + 12, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, ...shadows.md }}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, height: 18, minWidth: 0 }}>
            {weather ? (
              <>
                <Icon name={weather.icon} size={16} color="rgba(255,255,255,0.85)" />
                {/* flexShrink:1 — RN flex items default to flexShrink:0 (unlike CSS's
                    default of 1), so without this a long real city/condition string
                    (from real GPS on-device) overflows the row uncropped instead of
                    shrinking to fit + truncating with numberOfLines.
                    Explicit lineHeight — without it, this bold custom font clips
                    descenders (y/g/p/q) at the bottom on Android instead of reserving
                    room for them, e.g. "cloudy" rendering as "cloudv". */}
                <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 12.5, lineHeight: Math.round(12.5 * leading.snug), color: 'rgba(255,255,255,0.8)' }}>
                  {weather.temp}°F · {t.header.weatherLabels[weather.labelKey]}{weather.city ? ` ${t.header.weatherIn} ${weather.city}` : ''}
                </Text>
              </>
            ) : (
              <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 12.5, lineHeight: Math.round(12.5 * leading.snug), color: 'rgba(255,255,255,0.65)' }}>
                {t.header.weatherLoading}
              </Text>
            )}
          </View>
        </View>
        <View>
          <IconButton
            icon="notification"
            variant="glass"
            shadow={shadows.xs}
            label={t.header.notifications}
            onPress={onNotificationsPress ?? (() => router.push('/notifications'))}
          />
          {unread > 0 && (
            <View style={{
              position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9,
              paddingHorizontal: 4, backgroundColor: theme.danger, borderWidth: 2, borderColor: theme.primary,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 9.5, lineHeight: 12, color: '#fff' }}>
                {unread > 9 ? '9+' : unread}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        {/* Opens the advanced filter drawer — not built yet, so this is inert for now. */}
        <IconButton icon="sliders" size="sm" variant="glass" shadow={shadows.xs} label={t.header.filters} onPress={onFiltersPress} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, flex: 1 }}>
          <Chip size="sm" selected={filterType === 'all'} color={theme.gradientJade} shadow={shadows.xs} onPress={() => onFilterChange('all')}>{t.feed.chipAll}</Chip>
          <Chip size="sm" selected={filterType === 'offer'} color={theme.gradientJade} shadow={shadows.xs} onPress={() => onFilterChange('offer')}>{t.feed.chipPooling}</Chip>
          <Chip size="sm" selected={filterType === 'request'} color={theme.gradientJade} shadow={shadows.xs} onPress={() => onFilterChange('request')}>{t.feed.chipRide}</Chip>
        </View>
        {/* Single toggle — icon reflects the currently active layout, tap flips to the other. */}
        <IconButton
          icon={layout === 'list' ? 'layout_list' : 'layout_grid'}
          size="sm"
          variant="glass"
          shadow={shadows.xs}
          label={layout === 'list' ? t.header.gridView : t.header.listView}
          onPress={() => onLayoutChange(layout === 'list' ? 'grid' : 'list')}
        />
      </View>

      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 10 }}>
        {resultsCount} {t.feed.resultsCount}
      </Text>
    </LinearGradient>
  );
}
