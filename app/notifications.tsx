import { useEffect, useRef, useState } from 'react';
import { View, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Chip } from '@/components/ui/Chip';
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
import { formatRelativeTime } from '@/utils/dateFormat';

const screenWidth = Dimensions.get('window').width;

// Matches ui_kits/ridemate-app/NotificationCenter.jsx's NC_TYPE_META — the 5
// notification types this app's DB actually produces (026_notifications.sql,
// trip_update added in 051). The design's offer/reminder/system types still
// belong to features that don't exist here yet. "New post" alerts
// (053_push_tokens_and_new_post_push.sql) are deliberately NOT one of
// these — they're real OS push only, never shown in this in-app screen; see
// hooks/usePushNotifications.ts.
const TYPE_META: Record<NotificationType, { icon: IconName; color: string; bg: string }> = {
  message: { icon: 'chat', color: '#ED4A2B', bg: '#FFF1ED' },
  agreement_created: { icon: 'check', color: '#2BA84A', bg: '#2BA84A1A' },
  agreement_completed: { icon: 'check_circle', color: '#0A7E77', bg: '#E6FAF8' },
  badge_received: { icon: 'sparkles', color: '#D9B871', bg: '#D9B8711F' },
  trip_update: { icon: 'warning', color: '#9E4A14', bg: 'rgba(224,123,57,0.14)' },
};

const TRIP_UPDATE_DETAIL_PATH: Record<string, string> = {
  ride: '/ride/[id]',
  package: '/package/[id]',
  hauling: '/hauling/[id]',
};

type Filter = 'all' | 'unread';

export default function NotificationsScreen() {
  const { session } = useAuthStore();
  const { getNotifications, markAllRead, markRead, deleteNotification } = useNotifications();
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const [items, setItems] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      setLoading(true);
      try {
        setItems(await getNotifications(session.user.id));
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.user?.id]);

  const unreadCount = items.filter((n) => !n.read_at).length;
  const visible = filter === 'unread' ? items.filter((n) => !n.read_at) : items;

  async function handleMarkAllRead() {
    if (!session?.user || unreadCount === 0) return;
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    try {
      await markAllRead(session.user.id);
    } catch {}
  }

  async function handleDelete(id: string) {
    swipeableRefs.current.get(id)?.close();
    swipeableRefs.current.delete(id);
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch {
      // Deletion failed silently server-side; the item stays gone locally
      // until the next screen visit re-fetches — acceptable for a low-stakes action.
    }
  }

  function handlePress(n: AppNotification) {
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      markRead(n.id).catch(() => {});
    }
    if (n.type === 'message' && n.data.conversation_id) {
      router.push({ pathname: '/messages/[id]', params: { id: n.data.conversation_id as string } });
    } else if (n.type === 'agreement_created' || n.type === 'agreement_completed') {
      router.push('/(tabs)/messages');
    } else if (n.type === 'badge_received') {
      router.push('/(tabs)/profile');
    } else if (n.type === 'trip_update' && n.data.post_id) {
      const pathname = TRIP_UPDATE_DETAIL_PATH[n.data.post_kind as string] ?? '/ride/[id]';
      router.push({ pathname: pathname as any, params: { id: n.data.post_id as string } });
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg, zIndex: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
              {t.notificationsScreen.title}
            </Text>
            {unreadCount > 0 && (
              <View style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: theme.driverText, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, lineHeight: 12, color: '#fff', includeFontPadding: false, textAlignVertical: 'center' }}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} style={{ paddingVertical: 4 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: theme.gold300 }}>{t.notificationsScreen.markAllRead}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 }}>
          <Chip size="sm" selected={filter === 'all'} color={theme.gradientJade} shadow={shadows.xs} onPress={() => setFilter('all')}>
            {t.notificationsScreen.filterAll}
          </Chip>
          <Chip size="sm" selected={filter === 'unread'} color={theme.gradientJade} shadow={shadows.xs} count={unreadCount > 0 ? unreadCount : undefined} onPress={() => setFilter('unread')}>
            {t.notificationsScreen.filterUnread}
          </Chip>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.primary} />
      ) : (
        <FlatList
          data={visible}
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
                {filter === 'unread' ? t.notificationsScreen.noUnread : t.notificationsScreen.empty}
              </Text>
              {filter === 'all' && (
                <Text style={{ color: theme.muted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 }}>
                  {t.notificationsScreen.emptySubtitle}
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const unread = !item.read_at;
            const meta = TYPE_META[item.type];
            return (
              <Swipeable
                ref={(ref) => {
                  if (ref) swipeableRefs.current.set(item.id, ref);
                  else swipeableRefs.current.delete(item.id);
                }}
                leftThreshold={screenWidth * 0.55}
                onSwipeableOpen={(direction) => direction === 'left' && handleDelete(item.id)}
                renderLeftActions={() => (
                  <View style={{
                    flex: 1, marginRight: 10, borderRadius: radii.lg,
                    backgroundColor: theme.danger, alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 20,
                  }}>
                    <Icon name="delete" size={22} color="#fff" />
                  </View>
                )}
              >
                <View style={{
                  backgroundColor: theme.surface, borderRadius: radii.lg,
                  borderWidth: 1, borderColor: theme.cardBorder,
                  borderLeftWidth: unread ? 3 : 1, borderLeftColor: unread ? meta.color : theme.cardBorder,
                  overflow: 'hidden', ...(unread ? shadows.xs : {}),
                }}>
                  <TouchableOpacity onPress={() => handlePress(item)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 }}>
                    <View style={{
                      width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: meta.bg,
                    }}>
                      <Icon name={meta.icon} size={20} color={meta.color} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} style={{ fontFamily: unread ? fonts.bodyBold : fonts.bodySemibold, fontSize: 13.5, color: theme.text }}>
                            {item.title}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint, flexShrink: 0 }}>
                          {formatRelativeTime(item.created_at, t.locale, {
                            justNow: t.notificationsScreen.justNow,
                            minAgo: t.notificationsScreen.minAgo,
                            hAgo: t.notificationsScreen.hAgo,
                            yesterday: t.notificationsScreen.yesterday,
                            dAgo: t.notificationsScreen.dAgo,
                          })}
                        </Text>
                      </View>
                      {item.body && (
                        <Text numberOfLines={1} style={{ fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.muted, marginTop: 3 }}>
                          {item.body}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              </Swipeable>
            );
          }}
        />
      )}
    </View>
  );
}
