import { View, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { RidePostKind } from '@/types';
import { IconName } from '@/constants/icons';
import { fonts, shadows } from '@/constants/themes';
import { tracking, leading, letterSpacingFor } from '@/constants/typography';

// Post Chooser — the category picker shown before any post form (design
// system: templates/ridemate-app/PostChooser.jsx). The mockup's header uses
// `--gradient-midnight`, a holdover token name from the retired "Miami
// Nights" theme — under the shipped `[data-theme="day"]` (Sunset) values
// that token resolves to the exact same coral/gold gradient as everything
// else (theme.gradientGold), not a dark header, confirmed against
// tokens/colors.css.
export default function PostChooserScreen() {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  const POST_TYPES: { id: RidePostKind; icon: IconName; accent: string; soft: string; title: string; desc: string }[] = [
    { id: 'ride', icon: 'car', accent: theme.driverText, soft: theme.driverSoft, title: t.post.chooserRideTitle, desc: t.post.chooserRideDesc },
    { id: 'package', icon: 'package', accent: theme.courierText, soft: theme.courierSoft, title: t.post.chooserPackageTitle, desc: t.post.chooserPackageDesc },
    { id: 'hauling', icon: 'truck', accent: theme.haulingText, soft: theme.haulingSoft, title: t.post.chooserHaulingTitle, desc: t.post.chooserHaulingDesc },
  ];

  function handleSelect(id: RidePostKind) {
    if (id === 'ride') {
      router.push('/post/ride');
    } else {
      // Package/Hauling forms don't exist yet — design system's PostPackage.jsx
      // and PostHauling.jsx are a separate build, not in scope here.
      Alert.alert(t.post.comingSoonTitle, t.post.comingSoonMsg);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 22, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <IconButton icon="close" variant="glass" label={t.post.close} onPress={() => router.push('/(tabs)')} />
          <Text style={{
            fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase',
            letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300,
          }}>
            {t.post.chooserEyebrow}
          </Text>
          {/* Same width as the close button — balances the row so the eyebrow
              label above lands visually centered without needing flex:1 on it. */}
          <View style={{ width: 44 }} />
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 12, alignItems: 'center' }}>
          <Text style={{
            fontFamily: fonts.displayBold, fontSize: 28,
            letterSpacing: letterSpacingFor(28, tracking.tight),
            color: theme.cream, textAlign: 'center',
          }}>
            {t.post.chooserTitleStart}{' '}
            <Text style={{ fontFamily: fonts.bodyItalic, color: theme.gold300 }}>
              {t.post.chooserTitleAccent}
            </Text>
          </Text>
          <Text style={{
            fontFamily: fonts.bodyRegular, fontSize: 13.5,
            color: 'rgba(255,255,255,0.75)', marginTop: 5, textAlign: 'center',
          }}>
            {t.post.chooserSubtitle}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, gap: 14 }}
      >
        {POST_TYPES.map((opt) => (
          <Card key={opt.id} interactive onPress={() => handleSelect(opt.id)} padding={18} radius={20} elevation="sm">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{
                width: 54, height: 54, borderRadius: 16,
                backgroundColor: opt.soft, alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={opt.icon} size={26} color={opt.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{
                  fontFamily: fonts.displayBold, fontSize: 20,
                  letterSpacing: letterSpacingFor(20, tracking.tight), color: theme.text,
                }}>
                  {opt.title}
                </Text>
                <Text style={{
                  fontFamily: fonts.bodyRegular, fontSize: 13, color: theme.muted,
                  marginTop: 3, lineHeight: Math.round(13 * leading.snug),
                }}>
                  {opt.desc}
                </Text>
              </View>
              <Icon name="chevron_right" size={20} color={theme.textFaint} />
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
