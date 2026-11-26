import { useCallback, useState } from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { InfoSheet } from '@/components/ui/InfoSheet';
import { HistoryCard } from '@/components/ride/HistoryCard';
import { useAuthStore } from '@/store/authStore';
import { useRides } from '@/hooks/useRides';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { RideAgreement, RidePost } from '@/types';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { repostMsLeft } from '@/constants/repost';

const EDIT_PATH: Record<string, string> = {
  ride: '/ride/edit/[id]',
  package: '/package/edit/[id]',
  hauling: '/hauling/edit/[id]',
};

// Re-post screen — the caller's expired posts still inside their grace
// window (72 h Free / 30 days Donor, see constants/repost.ts and
// 070_post_expiry_and_repost.sql). Tapping one opens that kind's normal edit
// screen in repost mode, which requires a future date and flips the post
// back to active on save. Reuses Ride history's HistoryCard.
export default function RepostScreen() {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const { isDonor } = useSubscription();
  const { getExpiredPosts, deleteExpiredPost } = useRides();
  const myId = session?.user?.id ?? '';

  const [posts, setPosts] = useState<RidePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<RidePost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!myId) return;
    setLoading(true);
    try { setPosts(await getExpiredPosts(myId)); }
    catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setLoading(false); }
  }, [myId]);

  // Refetch on focus — coming back from a successful repost must drop it.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function timeLeftLabel(post: RidePost): string {
    const ms = repostMsLeft(post.expired_at, isDonor);
    const hours = Math.floor(ms / 3_600_000);
    if (hours >= 48) return t.repost.deletedInDays.replace('{n}', String(Math.floor(hours / 24)));
    if (hours >= 1) return t.repost.deletedInHours.replace('{n}', String(hours));
    return t.repost.deletedSoon;
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteExpiredPost(toDelete.id);
      setPosts((prev) => prev.filter((p) => p.id !== toDelete.id));
      setToDelete(null);
    } catch (e: any) {
      setToDelete(null);
      setError(e?.message ?? String(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 18, paddingHorizontal: 16, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg, zIndex: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {t.repost.eyebrow}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 24, letterSpacing: letterSpacingFor(24, tracking.tight), color: theme.cream, textAlign: 'center', marginTop: 10 }}>
          {t.repost.title}
        </Text>
        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4, paddingHorizontal: 12 }}>
          {isDonor ? t.repost.subtitleDonor : t.repost.subtitleFree}
        </Text>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          renderItem={({ item }) => {
            // HistoryCard takes an agreement; a post the user offered as a
            // driver should read as "driver" (car icon / driver accent).
            const asAgreement = {
              id: item.id, post_id: item.id,
              driver_id: item.type === 'offer' ? myId : '',
              rider_id: item.type === 'offer' ? '' : myId,
              post: item,
            } as unknown as RideAgreement;
            return (
              <HistoryCard
                agreement={asAgreement}
                myId={myId}
                selectionMode={false}
                selected={false}
                onLongPress={() => {}}
                onToggleSelect={() => {}}
                onPress={() => router.push({ pathname: (EDIT_PATH[item.kind] ?? EDIT_PATH.ride) as any, params: { id: item.id, repost: '1' } })}
                note={timeLeftLabel(item)}
                rightAction={
                  <TouchableOpacity
                    onPress={() => setToDelete(item)}
                    style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.cardBorder }}
                  >
                    <Icon name="delete" size={18} color={theme.danger} />
                  </TouchableOpacity>
                }
              />
            );
          }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <View style={{ width: 72, height: 72, borderRadius: radii.xl, backgroundColor: theme.primary + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon name="history" size={36} color={theme.primary} />
              </View>
              <Text style={{ color: theme.text, fontFamily: fonts.displayBold, fontSize: 18, marginBottom: 8 }}>
                {t.repost.empty}
              </Text>
              <Text style={{ color: theme.muted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 }}>
                {isDonor ? t.repost.emptySubtitleDonor : t.repost.emptySubtitleFree}
              </Text>
            </View>
          }
        />
      )}

      <ConfirmSheet
        visible={!!toDelete}
        tone="danger"
        icon="delete"
        title={t.repost.deleteTitle}
        message={t.repost.deleteMsg}
        confirmLabel={t.repost.deleteConfirm}
        cancelLabel={t.profile.cancel}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        busy={deleting}
      />
      <InfoSheet
        visible={!!error}
        tone="danger"
        icon="warning"
        title={t.rideDetail.errorTitle}
        message={error ?? ''}
        confirmLabel={t.common.ok}
        onClose={() => setError(null)}
      />
    </View>
  );
}
