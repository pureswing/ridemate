import { useCallback, useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { Chip } from '@/components/ui/Chip';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { renderBodyWithBoldPrice } from '@/components/ui/HighlightedPrice';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useMessages } from '@/hooks/useMessages';
import { useRideAgreements } from '@/hooks/useRideAgreements';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Conversation, Message, RideAgreement } from '@/types';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';

type Tone = 'neutral' | 'driver' | 'passenger' | 'courier' | 'hauling' | 'success' | 'warning' | 'accent' | 'inverse';

// Filter buckets for the inbox header chips — 'active' is the default.
// Cancelled/no_show agreements are folded into 'completed' (both are
// "closed" threads) since there's no dedicated 4th chip for them.
type FilterBucket = 'negotiating' | 'active' | 'completed';

function bucketOf(agreement: RideAgreement | null): FilterBucket {
  if (!agreement) return 'negotiating';
  if (agreement.status === 'completed' || agreement.status === 'cancelled' || agreement.status === 'no_show') return 'completed';
  return 'active';
}

function statusConfig(agreement: RideAgreement | null, t: ReturnType<typeof useTranslation>): { tone: Tone; label: string } {
  if (!agreement) return { tone: 'accent', label: t.agreement.statusActive };
  switch (agreement.status) {
    case 'completed': return { tone: 'success', label: t.agreement.statusCompleted };
    case 'cancelled': return { tone: 'neutral', label: t.calendar.cancelled };
    case 'no_show': return { tone: 'neutral', label: t.calendar.cancelled };
    default: return { tone: 'success', label: t.agreement.statusConfirmed };
  }
}

function ConversationRow({ conversation, myId, agreement, insured }: { conversation: Conversation; myId: string; agreement: RideAgreement | null; insured: boolean }) {
  const theme = useTheme();
  const t = useTranslation();
  const { getLastMessage, getUnreadCount } = useMessages();
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const [unread, setUnread] = useState(0);

  const otherParty = conversation.post_owner_id === myId ? conversation.requester : conversation.post_owner;
  const post = conversation.post;

  useEffect(() => {
    (async () => {
      try {
        const [msg, count] = await Promise.all([
          getLastMessage(conversation.id),
          getUnreadCount(conversation.id),
        ]);
        setLastMessage(msg);
        setUnread(count);
      } catch {}
    })();
  }, [conversation.id]);

  const status = statusConfig(agreement, t);

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/messages/[id]', params: { id: conversation.id } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}
    >
      <View style={{ flexShrink: 0 }}>
        <Avatar name={otherParty?.full_name ?? '?'} src={otherParty?.avatar_url} size={50} verified={insured} />
        {unread > 0 && (
          <View style={{
            position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: 9,
            backgroundColor: theme.passengerText, borderWidth: 2, borderColor: theme.background,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 9.5, lineHeight: 12, color: '#fff' }}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
          {post ? (
            <Text numberOfLines={1} style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12.5, flexShrink: 1 }}>
              <Text style={{ color: theme.gold500, fontFamily: fonts.bodyExtraBold }}>{post.origin_city}</Text>
              {/* Same city on both ends = no real dropoff (e.g. hauling posted
                  with disposal:'driver' — destination_city just reuses
                  origin_city since that DB column is NOT NULL). */}
              {post.destination_city !== post.origin_city && (
                <>
                  <Text style={{ color: theme.textFaint }}> → </Text>
                  <Text style={{ color: theme.gold500, fontFamily: fonts.bodyExtraBold }}>{post.destination_city}</Text>
                </>
              )}
            </Text>
          ) : (
            <Text numberOfLines={1} style={{ fontFamily: fonts.bodyExtraBold, fontSize: 12.5, color: theme.text }}>{otherParty?.full_name ?? '—'}</Text>
          )}
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: theme.textFaint, flexShrink: 0 }}>
            {new Date(conversation.last_message_at).toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          <Badge tone={status.tone} size="sm">{status.label}</Badge>
          <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: theme.muted, flexShrink: 1 }}>
            {otherParty?.full_name ?? '—'}
          </Text>
        </View>
        <Text numberOfLines={1} style={{
          fontFamily: unread > 0 ? fonts.bodySemibold : fonts.bodyRegular, fontSize: 13,
          color: unread > 0 ? theme.text : theme.muted,
        }}>
          {lastMessage?.body ? renderBodyWithBoldPrice(lastMessage.body) : t.messages.noMessagesYet}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const { session } = useAuthStore();
  const { getConversations } = useMessages();
  const { getAgreementsForPost } = useRideAgreements();
  const t = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  // Keyed by conversation.id — fetched once here (not per-row) so the
  // filter chips can bucket every conversation without each row doing its
  // own redundant getAgreementsForPost call.
  const [agreements, setAgreements] = useState<Record<string, RideAgreement | null>>({});
  // Keyed by the OTHER party's user id — vehicle_profiles is publicly
  // readable, batch-fetched once here (not per-row) same as agreements above.
  const [insuredUsers, setInsuredUsers] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterBucket>('active');

  useFocusEffect(
    useCallback(() => {
      if (!session?.user) return;
      fetchConversations();
    }, [session])
  );

  async function fetchConversations() {
    setLoading(true);
    try {
      const myId = session!.user.id;
      const convs = await getConversations();
      setConversations(convs);

      // Dedupe by post_id — several conversations can share the same post.
      const postIds = Array.from(new Set(convs.map((c) => c.post_id)));
      const agreementsByPost = new Map<string, RideAgreement[]>();
      await Promise.all(postIds.map(async (postId) => {
        try {
          agreementsByPost.set(postId, await getAgreementsForPost(postId));
        } catch {
          agreementsByPost.set(postId, []);
        }
      }));
      const map: Record<string, RideAgreement | null> = {};
      for (const c of convs) {
        const list = agreementsByPost.get(c.post_id) ?? [];
        map[c.id] = list.find((a) => a.rider_id === myId || a.driver_id === myId) ?? null;
      }
      setAgreements(map);

      const otherPartyIds = Array.from(new Set(convs.map((c) => (c.post_owner_id === myId ? c.requester_id : c.post_owner_id))));
      if (otherPartyIds.length > 0) {
        const { data } = await supabase
          .from('vehicle_profiles')
          .select('user_id, insurance_self_certified')
          .in('user_id', otherPartyIds);
        const insuredMap: Record<string, boolean> = {};
        for (const v of data ?? []) {
          if (v.insurance_self_certified) insuredMap[v.user_id] = true;
        }
        setInsuredUsers(insuredMap);
      }
    } finally {
      setLoading(false);
    }
  }

  const filtered = conversations.filter((c) => bucketOf(agreements[c.id] ?? null) === filter);

  const filters: { key: FilterBucket; label: string }[] = [
    { key: 'active', label: t.messages.filterActive },
    { key: 'negotiating', label: t.messages.filterNegotiating },
    { key: 'completed', label: t.messages.filterCompleted },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 18, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, ...shadows.md }}
      >
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
          {t.messages.eyebrow}
        </Text>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 28, letterSpacing: letterSpacingFor(28, tracking.tight), color: theme.cream, marginTop: 4 }}>
          {t.messages.title}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          {filters.map((f) => (
            <Chip
              key={f.key}
              size="sm"
              selected={filter === f.key}
              color={theme.gradientJade}
              shadow={shadows.xs}
              onPress={() => setFilter(f.key)}
            >
              {f.label}
            </Chip>
          ))}
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const otherPartyId = item.post_owner_id === session!.user.id ? item.requester_id : item.post_owner_id;
            return (
              <ConversationRow
                conversation={item}
                myId={session!.user.id}
                agreement={agreements[item.id] ?? null}
                insured={insuredUsers[otherPartyId] ?? false}
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.cardBorder, marginLeft: 64 }} />}
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <View style={{
                width: 72, height: 72, borderRadius: radii.xl,
                backgroundColor: theme.primary + '1A',
                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <Icon name="chat" size={36} color={theme.primary} />
              </View>
              <Text style={{ color: theme.text, fontFamily: fonts.displayBold, fontSize: 18, marginBottom: 8 }}>
                {conversations.length === 0 ? t.messages.empty : t.messages.filterEmpty}
              </Text>
              {conversations.length === 0 && (
                <Text style={{ color: theme.muted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 }}>
                  {t.messages.emptySubtitle}
                </Text>
              )}
            </View>
          }
          refreshing={loading}
          onRefresh={fetchConversations}
        />
      )}
    </View>
  );
}
