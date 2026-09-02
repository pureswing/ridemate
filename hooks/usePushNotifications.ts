import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

// System-tray push only — see supabase/migrations/053_push_tokens_and_new_post_push.sql.
// Deliberately does NOT touch public.notifications; a tapped push deep-links
// straight to the post, the same way notifications.tsx's trip_update/new_post
// rows do, without ever appearing in that in-app screen.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const POST_KIND_DETAIL_PATH: Record<string, string> = {
  ride: '/ride/[id]',
  package: '/package/[id]',
  hauling: '/hauling/[id]',
};

async function registerToken(userId: string) {
  if (!Device.isDevice) return; // simulators/emulators have no push capability

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

  await supabase.from('push_tokens').upsert(
    { user_id: userId, expo_push_token: expoPushToken, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
    { onConflict: 'expo_push_token' }
  );
}

// Call once per authenticated session (app/_layout.tsx) — registers this
// device's push token and wires tapping a push to open the right post.
export function usePushNotifications(userId: string | undefined) {
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

  useEffect(() => {
    if (userId) registerToken(userId).catch(() => {});
  }, [userId]);

  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        post_id?: string;
        post_kind?: string;
        conversation_id?: string;
      };
      if (data?.conversation_id) {
        router.push({ pathname: '/messages/[id]', params: { id: data.conversation_id } });
      } else if (data?.post_id) {
        const pathname = POST_KIND_DETAIL_PATH[data.post_kind as string] ?? '/ride/[id]';
        router.push({ pathname: pathname as any, params: { id: data.post_id } });
      }
    });
    return () => responseListener.current?.remove();
  }, []);
}
