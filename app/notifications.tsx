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
import { DriftText } from '@/components/ui/DriftText';
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
// route_alert added in 044). The design's offer/reminder/system types still
// belong to features that don't exist here yet.
const TYPE_META: Record<NotificationType, { icon: IconName; color: string; bg: string }> = {
  message: { icon: 'chat', color: '#ED4A2B', bg: '#FFF1ED' },
  agreement_created: { icon: 'check', color: '#2BA84A', bg: '#2BA84A1A' },
  agreement_completed: { icon: 'check_circle', color: '#0A7E77', bg: '#E6FAF8' },
  badge_received: { icon: 'sparkles', color: '#D9B871', bg: '#D9B8711F' },
  route_alert: { icon: 'warning', color: '#9E4A14', bg: 'rgba(224,123,57,0.14)' },
};

const ROUTE_ALERT_EDIT_PATH: Record<string, string> = {
  ride: '/ride/edit/[id]',
  package: '/package/edit/[id]',
  hauling: '/hauling/edit/[id]',
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
  const [expanded, setExpanded] = useState<string | null>(null);

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
    if (n.type === 'route_alert') {
      // Expands inline instead of navigating away — matches the design's
      // route-alert row, which is its own mini-panel (scenario + adjust
      // chips), not a deep link to another screen.
      setExpanded((prev) => (prev === n.id ? null : n.id));
    } else if (n.type === 'message' && n.data.conversation_id) {
      router.push({ pathname: '/messages/[id]', params: { id: n.data.conversation_id as string } });
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
            const isRouteAlert = item.type === 'route_alert';
            const isOpen = isRouteAlert && expanded === item.id;
            const hasUpdate = !!item.data.has_update;
            const adjustOptions = (item.data.adjust_options as number[] | undefined) ?? [];
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
                          {isRouteAlert ? (
                            <DriftText style={{ fontFamily: unread ? fonts.bodyBold : fonts.bodySemibold, fontSize: 13.5, color: theme.text }}>
                              {item.title}
                            </DriftText>
                          ) : (
                            <Text numberOfLines={1} style={{ fontFamily: unread ? fonts.bodyBold : fonts.bodySemibold, fontSize: 13.5, color: theme.text }}>
                              {item.title}
                            </Text>
                          )}
                        </View>
                        {isRouteAlert ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: meta.bg, flexShrink: 0 }}>
                            <Icon name="brain" size={10} color={meta.color} />
                            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, color: meta.color, includeFontPadding: false }}>{t.notificationsScreen.aiTag}</Text>
                          </View>
                        ) : (
                          <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint, flexShrink: 0 }}>
                            {formatRelativeTime(item.created_at, t.locale, {
                              justNow: t.notificationsScreen.justNow,
                              minAgo: t.notificationsScreen.minAgo,
                              hAgo: t.notificationsScreen.hAgo,
                              yesterday: t.notificationsScreen.yesterday,
                              dAgo: t.notificationsScreen.dAgo,
                            })}
                          </Text>
                        )}
                      </View>
                      {item.body && (
                        <Text numberOfLines={1} style={{ fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.muted, marginTop: 3 }}>
                          {item.body}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
                      <View style={{ padding: 14, backgroundColor: hasUpdate ? theme.haulingSoft : theme.driverSoft }}>
                        <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12.5, color: hasUpdate ? theme.haulingText : theme.driverText }}>
                          {hasUpdate ? t.notificationsScreen.routeChangeDetected : t.notificationsScreen.routeAllClear}
                        </Text>
                        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.muted, marginTop: 2, lineHeight: 17 }}>
                          {hasUpdate ? t.notificationsScreen.routeAdjustSub : t.notificationsScreen.routeAllClearSub}
                        </Text>
                      </View>
                      {hasUpdate && adjustOptions.length > 0 && (
                        <View style={{ padding: 14 }}>
                          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                            {adjustOptions.map((min) => (
                              <TouchableOpacity
                                key={min}
                                onPress={() => {
                                  const pathname = ROUTE_ALERT_EDIT_PATH[item.data.post_kind as string] ?? '/ride/edit/[id]';
                                  router.push({ pathname: pathname as any, params: { id: item.data.post_id as string } });
                                }}
                                style={{
                                  flex: 1, height: 36, borderRadius: radii.md,
                                  backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center',
                                }}
                              >
                                <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12, color: theme.haulingText }}>
                                  +{min}{t.notificationsScreen.routeAdjustMinutes}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <Text style={{ fontFamily: fonts.bodyItalic, fontStyle: 'italic', fontSize: 11, color: theme.textFaint, lineHeight: 16 }}>
                            {t.notificationsScreen.routeAdjustDisclaimer}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </Swipeable>
            );
          }}
        />
      )}
    </View>
  );
}
