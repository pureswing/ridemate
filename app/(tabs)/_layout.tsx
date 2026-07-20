import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { PlatformPressable } from '@react-navigation/elements';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { Icon } from '@/components/ui/Icon';
import { fonts, shadows } from '@/constants/themes';

export default function TabsLayout() {
  const { session, loading } = useAuthStore();
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!loading && !session) router.replace('/(auth)/welcome');
  }, [session, loading]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        // Explicit, not adaptive — some devices with a large system font-scale
        // setting make bottom-tabs auto-hide labels to avoid overflow.
        tabBarLabelPosition: 'below-icon',
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: theme.tabBarBg,
          borderTopColor:  theme.tabBorder,
          borderTopWidth:  1,
          // insets.bottom, not a fixed value — Android 15+/Expo 54's
          // edge-to-edge display means the tab bar draws under the system
          // gesture/nav bar, and a fixed paddingBottom left the label text
          // sitting underneath it. See the KeyboardAvoidingView/edge-to-edge
          // note for the same root cause elsewhere in the app.
          paddingBottom: insets.bottom + 10,
          paddingTop: 8,
          height: 58 + insets.bottom,
        },
        // Design spec is font-body bold (see AppShell.jsx's TabBar), not the display
        // face — was also pairing a custom fontFamily with a numeric fontWeight,
        // which Android silently can't resolve (see the typography audit artifact).
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.bodyBold, letterSpacing: 0.5 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.home,
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t.tabs.messages,
          tabBarIcon: ({ color, size }) => (
            <Icon name="chat" size={size} color={color} />
          ),
        }}
      />
      {/* FAB — center post button */}
      <Tabs.Screen
        name="post"
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <PlatformPressable
              {...props}
              style={[
                props.style,
                {
                  position: 'absolute',
                  // Centered on the tab bar's own top edge — same technique as
                  // RideCard's views-count pill: fixed height, top = -(height/2).
                  top: -29,
                  left: '50%',
                  marginLeft: -29,
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  borderWidth: 3,
                  borderColor: theme.tabBarBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...shadows.gold,
                },
              ]}
            >
              <LinearGradient
                colors={theme.gradientGold as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 26 }]}
              />
              <Icon name="add" size={24} color={theme.fabText} />
            </PlatformPressable>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t.tabs.calendar,
          tabBarIcon: ({ color, size }) => (
            <Icon name="event" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.you,
          tabBarIcon: ({ color, size }) => (
            <Icon name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
