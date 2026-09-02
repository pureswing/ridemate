import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { usePostToastStore, ToastPostKind, PostToast } from '@/store/postToastStore';
import { fonts, radii, shadows } from '@/constants/themes';
import { IconName } from '@/constants/icons';

const KIND_ICON: Record<ToastPostKind, IconName> = {
  ride: 'car',
  package: 'package',
  hauling: 'truck',
};

const VISIBLE_MS = 3000;
const FADE_MS = 250;

// Bottom-left, floating above the tab bar (58 + insets.bottom, matching
// app/(tabs)/_layout.tsx's own tabBarStyle height) so it never sits on top of
// the bottom nav — reserved even on stacked screens with no tab bar, which
// just floats it a little higher than strictly necessary there, never lower.
// Purely informational: no onPress, and the wrapper is pointerEvents="none"
// so it never steals a touch meant for whatever's underneath it.
export function PostToastHost() {
  const queue = usePostToastStore((s) => s.queue);
  const dismissToast = usePostToastStore((s) => s.dismissToast);
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  const current = queue[0] as PostToast | undefined;
  const [visibleToast, setVisibleToast] = useState<PostToast | undefined>(undefined);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (!current) return;
    setVisibleToast(current);
    opacity.setValue(0);
    translateY.setValue(8);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
    ]).start();

    const hideTimer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => {
        dismissToast(current.id);
      });
    }, VISIBLE_MS);

    return () => clearTimeout(hideTimer);
  }, [current?.id]);

  if (!visibleToast) return null;

  const label = {
    ride: t.toasts.newRide,
    package: t.toasts.newPackage,
    hauling: t.toasts.newHauling,
  }[visibleToast.kind];

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 16, bottom: 58 + insets.bottom + 12, zIndex: 50 }}
    >
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY }],
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.cardBorder,
          borderRadius: radii.pill, paddingVertical: 9, paddingHorizontal: 14,
          ...shadows.md,
        }}
      >
        <Icon name={KIND_ICON[visibleToast.kind]} size={16} color={theme.primary} />
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: theme.text }}>
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}
