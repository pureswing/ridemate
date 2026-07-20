import { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { useAuthStore } from '@/store/authStore';
import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNotification, NotificationType } from '@/types';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { IconName } from '@/constants/icons';
import { shortDateTime } from '@/utils/dateFormat';

const TYPE_ICON: Record<NotificationType, IconName> = {
  message: 'chat',
  agreement_created: 'handshake',
  agreement_completed: 'check_circle',
  badge_received: 'star',
};

export default function NotificationsScreen() {
  const { session } = useAuthStore();
  const { getNotifications, markAllRead } = useNotifications();
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<AppNotification[]>([]);
  // Snapshot of which ids were unread AT LOAD TIME — markAllRead fires right
  // after, but this screen still shows which ones were new during this view.
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      setLoading(true);
      try {
        const list = await getNotifications(session.user.id);
        setItems(list);
        setUnreadIds(new Set(list.filter((n) => !n.read_at).map((n) => n.id)));
        await markAllRead(session.user.id);
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.user?.id]);

  function handlePress(n: AppNotification) {
    if (n.type === 'message' && n.data.conversation_id) {
      router.push({ pathname: '/messages/[id]', params: { id: n.data.conversation_id } });
    } else if (n.type === 'agreement_created' || n.type === 'agreement_completed') {
      router.push('/(tabs)/messages');
    } else if (n.type === 'badge_received') {
      router.push('/(tabs)/profile');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 18, paddingHorizontal: 16, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {t.notificationsScreen.title}
          </Text>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <View style={{
                width: 72, height: 72, borderRadius: radii.xl,
                backgroundColor: theme.primary + '1A',
                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <Icon name="notification" size={36} color={theme.primary} />
              </View>
              <Text style={{ color: theme.text, fontFamily: fonts.displayBold, fontSize: 18, marginBottom: 8 }}>
                {t.notificationsScreen.empty}
              </Text>
              <Text style={{ color: theme.muted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 }}>
                {t.notificationsScreen.emptySubtitle}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const wasUnread = unreadIds.has(item.id);
            return (
              <TouchableOpacity
                onPress={() => handlePress(item)}
                style={{
                  flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                  backgroundColor: theme.surface, borderRadius: radii.lg,
                  borderWidth: 1, borderColor: wasUnread ? theme.borderGold : theme.cardBorder,
                  padding: 14, ...shadows.xs,
                }}
              >
                <View style={{
                  width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: wasUnread ? theme.primary + '18' : theme.surfaceAlt,
                }}>
                  <Icon name={TYPE_ICON[item.type]} size={18} color={wasUnread ? theme.primary : theme.muted} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: wasUnread ? fonts.bodyBold : fonts.bodySemibold, fontSize: 14, color: theme.text }}>
                    {item.title}
                  </Text>
                  {item.body && (
                    <Text numberOfLines={2} style={{ fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.muted, marginTop: 2 }}>
                      {item.body}
                    </Text>
                  )}
                  <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint, marginTop: 4 }}>
                    {shortDateTime(item.created_at, t.locale)}
                  </Text>
                </View>
                {wasUnread && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary, marginTop: 4 }} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
