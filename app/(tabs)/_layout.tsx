import { useEffect } from 'react';
import { View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { PlatformPressable } from '@react-navigation/elements';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { Icon } from '@/components/ui/Icon';
import { fonts } from '@/constants/themes';

export default function TabsLayout() {
  const { session, loading } = useAuthStore();
  const theme = useTheme();
  const t = useTranslation();

  useEffect(() => {
    if (!loading && !session) router.replace('/(auth)/welcome');
  }, [session, loading]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.tabBarBg,
          borderTopColor:  theme.tabBorder,
          borderTopWidth:  1,
          paddingBottom: 10,
          paddingTop: 8,
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
          title: t.tabs.rides,
          tabBarIcon: ({ color, size }) => (
            <Icon name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t.tabs.contacts,
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
                  top: -10,
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: theme.fab,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: theme.fab,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 6,
                  alignSelf: 'center',
                },
              ]}
            >
              <Icon name="add" size={22} color={theme.fabText} />
            </PlatformPressable>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarIcon: ({ color, size }) => (
            <Icon name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
