import { useEffect, useState } from 'react';
import { View, ScrollView, Alert, ActivityIndicator, Image, Share } from 'react-native';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { StatusBar } from 'expo-status-bar';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { RuleChip } from '@/components/ui/RuleChip';
import { OfferSheet } from '@/components/ride/OfferSheet';
import { ZoomableImageModal } from '@/components/ui/ZoomableImageModal';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useRides } from '@/hooks/useRides';
import { useRideAgreements } from '@/hooks/useRideAgreements';
import { useMessages } from '@/hooks/useMessages';
import { useBadges } from '@/hooks/useBadges';
import { RidePost, RidePostDetailsPackage, RideAgreement } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatEta, formatDurationShort } from '@/utils/dateFormat';
import { fonts, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { IconName } from '@/constants/icons';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function StatTile({ icon, label, value, theme }: { icon: IconName; label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 14, padding: 12, ...shadows.xs }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={17} color={theme.muted} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.bodyExtraBold, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: letterSpacingFor(9.5, tracking.wide), color: theme.textFaint }}>
          {label}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: theme.text, marginTop: 1 }}>{value}</Text>
      </View>
    </View>
  );
}

function SummaryChip({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 14, paddingVertical: 10, alignItems: 'center', ...shadows.xs }}>
      <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 9, textTransform: 'uppercase', letterSpacing: letterSpacingFor(9, tracking.wide), color: theme.textFaint }}>
        {label}
      </Text>
      <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: theme.text, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function AddressRow({ label, value, tone, theme }: { label: string; value: string; tone: 'driver' | 'passenger'; theme: ReturnType<typeof useTheme> }) {
  return (
    <View>
      <Badge tone={tone} icon="location" size="sm" iconSize={12} style={{ alignSelf: 'center', marginBottom: 8 }}>{label}</Badge>
      <View style={{ backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13 }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.text }}>{value}</Text>
      </View>
    </View>
  );
}


export default function PackageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const { getPostById, incrementPostViews } = useRides();
  const { getAgreementsForPost } = useRideAgreements();
  const { findConversation, findConversationWithParty, getOrCreateConversation, sendMessage } = useMessages();
  const { getBadgeCounts } = useBadges();
  const t = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [post, setPost] = useState<RidePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [messaged, setMessaged] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [myAgreement, setMyAgreement] = useState<RideAgreement | null>(null);
  const [goingToConversation, setGoingToConversation] = useState(false);
  const [posterBadgeCount, setPosterBadgeCount] = useState<number | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [mapZoomOpen, setMapZoomOpen] = useState(false);

  useEffect(() => {
    if (id) loadPost();
  }, [id]);

  async function loadPost() {
    setLoading(true);
    try {
      const data = await getPostById(id);
      setPost(data);
      if (data) {
        // Don't count the poster's own views of their own post.
        if (session?.user && data.user_id !== session.user.id) incrementPostViews(data.id);
        const tasks: Promise<any>[] = [
          getBadgeCounts(data.user_id).then((counts) => setPosterBadgeCount(counts.reduce((sum, c) => sum + c.count, 0))),
        ];
        if (session?.user) {
          tasks.push(
            getAgreementsForPost(data.id).then((agreements) => setMyAgreement(
              agreements.find((a) => a.rider_id === session.user.id || a.driver_id === session.user.id) ?? null
            )),
            findConversation(data.id).then((conv) => setMessaged(!!conv)),
          );
        }
        await Promise.all(tasks);
      }
    } catch {
      Alert.alert(t.rideDetail.errorTitle, t.rideDetail.loadError);
    } finally {
      setLoading(false);
    }
  }

  async function handleMessage(offerAmount?: number) {
    if (!session?.user || !post) return;
    if (post.user_id === session.user.id) {
      Alert.alert(t.rideDetail.ownAdMsg, t.rideDetail.ownAdAlert);
      return;
    }
    setMessaging(true);
    try {
      const conv = await getOrCreateConversation(post.id, post.user_id);
      if (!messaged) {
        if (offerAmount != null) {
          await sendMessage(conv.id, `${t.rideDetail.offerAutoMsgPrefix} $${offerAmount} ${t.rideDetail.offerAutoMsgSuffix}`);
        } else if (post.price_mode === 'firm') {
          await sendMessage(conv.id, t.rideDetail.interestedAutoMsg);
        }
      }
      setMessaged(true);
      setOfferOpen(false);
      router.push({ pathname: '/messages/[id]', params: { id: conv.id } });
    } catch {
      Alert.alert(t.rideDetail.errorTitle, t.messages.sendError);
    } finally {
      setMessaging(false);
    }
  }

  function handleShare() {
    if (!post) return;
    Share.share({ message: `${post.origin_city} → ${post.destination_city} — ${t.rideDetail.shareMessage}` });
  }

  // Owner-side "Message" — unlike handleMessage above, they never message
  // themselves; they need the confirmed agreement's counterpart to find
  // which of possibly several conversations on this post is the active one.
  async function handleGoToConversation() {
    if (!post || !myAgreement) return;
    const counterpartId = myAgreement.driver_id === session?.user?.id ? myAgreement.rider_id : myAgreement.driver_id;
    setGoingToConversation(true);
    try {
      const conv = await findConversationWithParty(post.id, counterpartId);
      if (conv) router.push({ pathname: '/messages/[id]', params: { id: conv.id } });
    } catch {
      Alert.alert(t.rideDetail.errorTitle, t.messages.loadError);
    } finally {
      setGoingToConversation(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!post) return null;

  const date = new Date(post.scheduled_at);
  const isOwner = post.user_id === session?.user?.id;
  const canEdit = isOwner && (date.getTime() - Date.now() > TWO_HOURS_MS);
  const accent = theme.courierText;

  const details = (post.details ?? {}) as RidePostDetailsPackage;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <ScrollView style={{ flex: 1 }} removeClippedSubviews={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ height: 240, backgroundColor: theme.surfaceAlt, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden', ...shadows.lg }}>
          {post.route_map_url ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setMapZoomOpen(true)} style={{ width: '100%', height: '100%' }}>
              <Image source={{ uri: post.route_map_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="package" size={32} color={theme.textFaint} />
            </View>
          )}
          <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
            <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          </View>
          <View style={{ position: 'absolute', top: insets.top + 8, right: 16 }}>
            <IconButton icon="share" variant="glass" label={t.rideDetail.share} onPress={handleShare} />
          </View>
        </View>

        <View style={{ padding: 20, gap: 18 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <SummaryChip theme={theme} label={t.rideDetail.eta} value={formatEta(post.scheduled_at, post.duration_seconds, t.locale)} />
            <SummaryChip theme={theme} label={t.rideDetail.duration} value={formatDurationShort(post.duration_seconds)} />
            <SummaryChip theme={theme} label={t.rideDetail.distance} value={post.distance_text ?? '—'} />
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Badge tone="courier" icon="package" iconSize={13}>{t.post.chooserPackageTitle}</Badge>
            {post.suggested_donation != null && (
              <Badge tone="warning" style={{ marginLeft: 'auto' }}>
                {post.price_mode === 'firm' ? `$${post.suggested_donation}` : `$${post.suggested_donation} OBO`}
              </Badge>
            )}
          </View>

          <View style={{ gap: 12 }}>
            <AddressRow theme={theme} tone="driver" label={t.rideDetail.origin} value={post.origin_address || post.origin_city} />
            <AddressRow theme={theme} tone="passenger" label={t.rideDetail.destination} value={post.destination_address || post.destination_city} />
          </View>

          {/* Matches the design's unified MetaTile grid (RideDetail.jsx's
              package section) — date/time/qty/size/declared-value/eta all as
              equal tiles, not a separate "Package details" list card. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ width: '47%' }}>
              <StatTile theme={theme} icon="event" label={t.rideDetail.date}
                value={date.toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })} />
            </View>
            <View style={{ width: '47%' }}>
              <StatTile theme={theme} icon="schedule" label={t.rideDetail.time}
                value={date.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })} />
            </View>
            {(details.qty ?? 1) > 1 && (
              <View style={{ width: '47%' }}>
                <StatTile theme={theme} icon="package" label="Quantity" value={`${details.qty} packages`} />
              </View>
            )}
            {!!details.packageSize && (
              <View style={{ width: '47%' }}>
                <StatTile theme={theme} icon="package" label="Size" value={details.packageSize} />
              </View>
            )}
            {!!details.declaredValue && (
              <View style={{ width: '47%' }}>
                <StatTile theme={theme} icon="dollar_sign_square" label="Value" value={`$${details.declaredValue}`} />
              </View>
            )}
          </View>

          {post.description && (
            <Field label={t.rideDetail.notes}>
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.textSecondary, lineHeight: 20 }}>
                {post.description}
              </Text>
            </Field>
          )}

          {(details.contentTags?.length ?? 0) > 0 && (
            <Field label="Contents (declared)">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {details.contentTags!.map((c) => (
                  <RuleChip key={c} active accent={accent} theme={theme} onPress={() => {}}>{c}</RuleChip>
                ))}
              </View>
            </Field>
          )}

          {(details.handling?.length ?? 0) > 0 && (
            <Field label="Special handling">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {details.handling!.map((h) => (
                  <RuleChip key={h} active accent={accent} theme={theme} onPress={() => {}}>{h}</RuleChip>
                ))}
              </View>
            </Field>
          )}

          <Card padding={14} elevation="sm" interactive onPress={() => router.push({ pathname: '/user/[id]', params: { id: post.user_id } })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={post.profile?.full_name ?? '?'} src={post.profile?.avatar_url} size={44} verified={post.profile?.vehicle_profiles?.some((v) => v.insurance_self_certified) ?? false} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: theme.text }}>
                  {post.profile?.full_name ?? '—'}
                </Text>
                {posterBadgeCount != null && posterBadgeCount > 0 && (
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: theme.muted, marginTop: 1 }}>
                    {posterBadgeCount} {posterBadgeCount === 1 ? t.rideDetail.badge : t.rideDetail.badges}
                  </Text>
                )}
              </View>
            </View>
          </Card>

          <View style={{
            backgroundColor: theme.warning + '1A',
            borderWidth: 1, borderColor: theme.warning + '4D',
            borderRadius: 14, padding: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Icon name="warning" size={18} color={theme.warning} />
              <Text style={{ color: theme.warning, fontSize: 18, fontFamily: fonts.bodyBold, includeFontPadding: false, textAlignVertical: 'center' }}>
                {t.rideDetail.warningTitle}
              </Text>
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 12.5, fontFamily: fonts.bodyRegular, lineHeight: 19, marginLeft: 28 }}>
              {t.rideDetail.warningText}
            </Text>
          </View>

        </View>
      </ScrollView>

      {isOwner ? (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 14,
          backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.cardBorder,
          paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 14,
          ...shadows.lg,
        }}>
          {myAgreement && (
            <View style={{ flex: 1 }}>
              <Button variant="primary" size="lg" fullWidth disabled={goingToConversation} onPress={handleGoToConversation}>
                {t.rideDetail.sendMessage}
              </Button>
            </View>
          )}

          <View style={{ flex: 1 }}>
            {canEdit ? (
              <Button variant="primary" size="lg" fullWidth onPress={() => router.push({ pathname: '/package/edit/[id]', params: { id: post.id } })}>
                {t.rideDetail.editPost}
              </Button>
            ) : (
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: theme.surfaceAlt, borderRadius: 14,
                paddingHorizontal: 16, paddingVertical: 12,
              }}>
                <Icon name="lock" size={14} color={theme.muted} />
                <Text style={{ color: theme.muted, fontSize: 12.5, fontFamily: fonts.bodyMedium }}>
                  {t.rideDetail.editLockedInline}
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 14,
          backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.cardBorder,
          paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 14,
          ...shadows.lg,
        }}>
          <View style={{ flex: 1 }}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={messaging}
              onPress={() => (messaged || post.price_mode === 'firm' ? handleMessage() : setOfferOpen(true))}
            >
              {messaging
                ? t.rideDetail.processing
                : messaged
                ? t.rideDetail.sendMessage
                : post.price_mode === 'firm'
                ? t.rideDetail.interested
                : t.rideDetail.sendOffer}
            </Button>
          </View>
        </View>
      )}

      <OfferSheet
        visible={offerOpen}
        askingPrice={post.suggested_donation}
        onClose={() => setOfferOpen(false)}
        onSubmit={(amount) => handleMessage(amount)}
      />
      <ZoomableImageModal
        visible={mapZoomOpen}
        uri={post.route_map_url}
        onClose={() => setMapZoomOpen(false)}
      />
    </View>
  );
}
