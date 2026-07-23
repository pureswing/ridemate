import { useEffect, useRef, useState } from 'react';
import { View, FlatList, TextInput, ActivityIndicator, Alert } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { BadgeSelector } from '@/components/community/BadgeSelector';
import { TripSummaryModal } from '@/components/ride/TripSummaryModal';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { renderBodyWithBoldPrice } from '@/components/ui/HighlightedPrice';
import { useAuthStore } from '@/store/authStore';
import { useMessages } from '@/hooks/useMessages';
import { useRideAgreements } from '@/hooks/useRideAgreements';
import { useBadges } from '@/hooks/useBadges';
import { useVehicleProfile } from '@/hooks/useVehicleProfile';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Conversation, Message, RideAgreement, TripRecord, VehicleProfile } from '@/types';
import { fonts, radii, shadows } from '@/constants/themes';
import { AMENITY_LABELS } from '@/components/profile/VehicleDetailModal';
import { IconName } from '@/constants/icons';

// Light polling instead of a Supabase Realtime channel — no realtime
// infrastructure exists elsewhere in this codebase, so this matches the
// established "fetch on mount / pull to refresh" convention rather than
// introducing a new one for just this screen.
const POLL_MS = 4000;

// ── Ride-status action panel — mark-complete / report-no-show / badges /
// trip record, moved here from the inbox row to sit with the actual chat
// (per ui_kits/ridemate-app/Messages.jsx's ChatThread, where ride status
// lives in the thread, not the inbox list). No "accept/decline an offer"
// flow here — that's fictional in the design source, this app's real
// confirm-a-ride action lives on the post detail screen (canConfirmRide),
// this panel only reflects/advances whatever agreement already exists. ──
function AgreementPanel({
  agreement,
  currentUserId,
  conversationId,
  theme,
  t,
  onUpdate,
}: {
  agreement: RideAgreement;
  currentUserId: string;
  conversationId: string;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useTranslation>;
  onUpdate: () => void;
}) {
  const { confirmCompletion, reportNoShow, cancelAgreement, loading } = useRideAgreements();
  const { hasGivenBadges } = useBadges();
  const { sendMessage } = useMessages();
  const [showBadges, setShowBadges] = useState(false);
  const [alreadyBadged, setAlreadyBadged] = useState(false);
  const [tripRecord, setTripRecord] = useState<TripRecord | null>(null);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showNoShowSheet, setShowNoShowSheet] = useState(false);
  const [reporting, setReporting] = useState(false);

  const isDriver = agreement.driver_id === currentUserId;
  const myRole = isDriver ? 'driver' : 'rider';
  const myConfirmedAt = isDriver ? agreement.driver_confirmed_at : agreement.rider_confirmed_at;
  const otherId = isDriver ? agreement.rider_id : agreement.driver_id;
  const otherName = isDriver ? agreement.rider?.full_name ?? '—' : agreement.driver?.full_name ?? '—';
  const otherAvatar = isDriver ? agreement.rider?.avatar_url : agreement.driver?.avatar_url;

  useEffect(() => {
    hasGivenBadges(agreement.id).then(setAlreadyBadged);
  }, [agreement.id]);

  // Badges fire immediately off MY OWN confirmation, not once both parties
  // have — see 034_completion_badges.sql's matching RLS relaxation.
  function handleMarkComplete() {
    Alert.alert(t.agreement.markCompleteTitle, t.agreement.markCompleteMsg, [
      { text: t.agreement.cancel, style: 'cancel' },
      {
        text: t.agreement.markComplete,
        onPress: async () => {
          try {
            await confirmCompletion(agreement.id, myRole);
            if (!alreadyBadged) setShowBadges(true);
            onUpdate();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  async function handleReportNoShow() {
    setReporting(true);
    try {
      await reportNoShow(agreement.id, otherId);
      setShowNoShowSheet(false);
      onUpdate();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setReporting(false);
    }
  }

  async function handleCancelJob() {
    setCancelling(true);
    try {
      await cancelAgreement(agreement.id);
      await sendMessage(conversationId, t.agreement.cancelledSystemMessage, true);
      setShowCancelSheet(false);
      onUpdate();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCancelling(false);
    }
  }

  function openTripRecord() {
    const post = agreement.post as any;
    setTripRecord({
      agreementId: agreement.id,
      origin: post?.origin_city ?? '—',
      destination: post?.destination_city ?? '—',
      scheduledAt: post?.scheduled_at ?? '',
      suggestedDonation: post?.suggested_donation,
      otherPartyName: otherName,
      myRole,
    });
  }

  if (agreement.status === 'completed') {
    return (
      <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, backgroundColor: theme.surface, padding: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {!alreadyBadged && (
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: theme.gold500, borderRadius: radii.md, paddingVertical: 11, alignItems: 'center' }}
              onPress={() => setShowBadges(true)}
            >
              <Text style={{ color: '#fff', fontFamily: fonts.bodyBold, fontSize: 13 }}>{t.badges.title}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={openTripRecord}
            style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: radii.md, paddingVertical: 11, alignItems: 'center' }}
          >
            <Text style={{ color: theme.muted, fontFamily: fonts.bodySemibold, fontSize: 13 }}>{t.tripSummary.title}</Text>
          </TouchableOpacity>
        </View>
        <BadgeSelector
          visible={showBadges}
          agreementId={agreement.id}
          receiverId={otherId}
          receiverName={otherName}
          receiverAvatar={otherAvatar}
          currentRole={myRole}
          kind={agreement.post?.kind ?? 'ride'}
          originCity={agreement.post?.origin_city ?? '—'}
          destinationCity={agreement.post?.destination_city ?? '—'}
          scheduledAt={agreement.post?.scheduled_at ?? ''}
          onDone={() => { setShowBadges(false); setAlreadyBadged(true); }}
        />
        <TripSummaryModal visible={!!tripRecord} record={tripRecord} onClose={() => setTripRecord(null)} />
      </View>
    );
  }

  if (agreement.status === 'no_show' || agreement.status === 'cancelled') {
    return (
      <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, backgroundColor: theme.danger + '0D', paddingVertical: 12, alignItems: 'center' }}>
        <Text style={{ color: theme.danger, fontSize: 13, fontFamily: fonts.bodyBold }}>{t.messages.conversationClosed}</Text>
      </View>
    );
  }

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, backgroundColor: theme.surface, padding: 12, gap: 8 }}>
      <Text style={{ textAlign: 'center', fontFamily: fonts.bodySemibold, fontSize: 12.5, color: theme.muted }}>
        {myConfirmedAt ? t.agreement.waitingOther : t.agreement.active}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {!myConfirmedAt && (
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: theme.driverText, borderRadius: radii.md, paddingVertical: 11, alignItems: 'center' }}
            onPress={handleMarkComplete}
            disabled={loading}
          >
            <Text style={{ color: '#fff', fontFamily: fonts.bodyBold, fontSize: 13 }}>{t.agreement.markComplete}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: theme.danger, borderRadius: radii.md, paddingVertical: 11, alignItems: 'center' }}
          onPress={() => setShowNoShowSheet(true)}
          disabled={loading}
        >
          <Text style={{ color: '#fff', fontSize: 13, fontFamily: fonts.bodyBold }}>{t.agreement.reportNoShow}</Text>
        </TouchableOpacity>
      </View>
      {isDriver && (
        <TouchableOpacity
          style={{ borderRadius: radii.md, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: theme.danger }}
          onPress={() => setShowCancelSheet(true)}
          disabled={loading}
        >
          <Text style={{ color: theme.danger, fontSize: 13, fontFamily: fonts.bodyBold }}>{t.agreement.cancelJob}</Text>
        </TouchableOpacity>
      )}
      <ConfirmSheet
        visible={showCancelSheet}
        tone="danger"
        icon="ban"
        title={t.agreement.cancelJobTitle}
        message={t.agreement.cancelJobMsg}
        confirmLabel={t.agreement.cancelJobConfirm}
        cancelLabel={t.agreement.cancel}
        onConfirm={handleCancelJob}
        onCancel={() => setShowCancelSheet(false)}
        busy={cancelling}
      />
      <ConfirmSheet
        visible={showNoShowSheet}
        tone="danger"
        icon="warning"
        title={t.agreement.reportTitle}
        message={t.agreement.reportMsg}
        confirmLabel={t.agreement.report}
        cancelLabel={t.agreement.cancel}
        onConfirm={handleReportNoShow}
        onCancel={() => setShowNoShowSheet(false)}
        busy={reporting}
      />
      <BadgeSelector
        visible={showBadges}
        agreementId={agreement.id}
        receiverId={otherId}
        receiverName={otherName}
        receiverAvatar={otherAvatar}
        currentRole={myRole}
        kind={agreement.post?.kind ?? 'ride'}
        originCity={agreement.post?.origin_city ?? '—'}
        destinationCity={agreement.post?.destination_city ?? '—'}
        scheduledAt={agreement.post?.scheduled_at ?? ''}
        onDone={() => { setShowBadges(false); setAlreadyBadged(true); }}
      />
    </View>
  );
}

// ── Vehicle peek card — collapsed by default, expands to show the other
// party's real vehicle_profile (make/model/year/color/seats/amenities).
// Scaled-down version of ChatThread.jsx's expandable offer card: the design
// also computes a requested-vs-offered "match %" from a negotiated-offer
// object this app's schema doesn't have, so that part is left out — only
// real vehicle_profiles data is shown. When no ride_agreement exists yet,
// accept/decline icon buttons float above it (per the design) — accept
// creates the real agreement (same call the post detail's "Confirm ride"
// button makes), decline deletes this unconfirmed conversation outright.
function VehiclePeekCard({
  vehicle,
  partyName,
  partyAvatar,
  tripCount,
  badgeCount,
  theme,
  t,
  onAccept,
  onDecline,
  accepting,
}: {
  // Absent for a pooling 'offer' post's owner-side card — the other party
  // there is a rider, who has no vehicle relevant to the trip. Falls back
  // to a trips/badges subtitle instead (see tripCount/badgeCount below).
  vehicle?: VehicleProfile | null;
  partyName: string;
  partyAvatar?: string;
  tripCount?: number;
  badgeCount?: number;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useTranslation>;
  onAccept?: () => void;
  onDecline?: () => void;
  accepting?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const subtitle = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.color}`
    : `${tripCount ?? 0} ${t.userProfile.trips} · ${badgeCount ?? 0} ${t.userProfile.badges}`;

  return (
    <View style={{ position: 'relative' }}>
      {(onAccept || onDecline) && (
        <View style={{ position: 'absolute', top: -18, right: 20, flexDirection: 'row', gap: 8, zIndex: 5 }}>
          {onDecline && (
            <TouchableOpacity
              onPress={onDecline}
              disabled={accepting}
              style={{
                width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: theme.danger,
                backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm,
              }}
            >
              <Icon name="ban" size={16} color={theme.danger} />
            </TouchableOpacity>
          )}
          {onAccept && (
            <TouchableOpacity
              onPress={onAccept}
              disabled={accepting}
              style={{
                width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: theme.driverText,
                backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm,
              }}
            >
              <Icon name="check" size={17} color={theme.driverText} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity
        activeOpacity={vehicle ? 0.9 : 1}
        disabled={!vehicle}
        onPress={() => setExpanded((v) => !v)}
        style={{
          marginHorizontal: 12, marginBottom: -1, backgroundColor: theme.surface,
          borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg,
          borderWidth: 1, borderColor: theme.cardBorder, borderBottomWidth: 0,
          ...shadows.sm,
        }}
      >
        <View style={{ width: 36, height: 4, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center', marginTop: 8 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, paddingTop: 8 }}>
          <Avatar name={partyName} src={partyAvatar} size={34} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 14, lineHeight: 17, color: theme.text }}>{partyName}</Text>
            <Text numberOfLines={1} style={{ fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 15, color: theme.muted, marginTop: 2 }}>
              {subtitle}
            </Text>
          </View>
        </View>

        {expanded && vehicle && (
          <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, padding: 14, paddingTop: 12, gap: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {vehicle.seats != null && <Badge tone="neutral" size="sm">{`${vehicle.seats} ${t.messages.vehicleSeats}`}</Badge>}
              {vehicle.insurance_self_certified && <Badge tone="success" icon="shield" size="sm">{t.messages.vehicleInsured}</Badge>}
            </View>
            {vehicle.amenities.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {vehicle.amenities.filter((a) => a in AMENITY_LABELS).map((a) => (
                  <View key={a} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5,
                    borderRadius: radii.pill, backgroundColor: theme.driverSoft, borderWidth: 1, borderColor: theme.driverBorder,
                  }}>
                    <Icon name={a as IconName} size={12} color={theme.driverText} />
                    <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11.5, color: theme.driverText }}>{AMENITY_LABELS[a]}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const { getConversationById, getMessages, sendMessage, markConversationRead, deleteConversation } = useMessages();
  const { getAgreementsForPost, createAgreement } = useRideAgreements();
  const { getMyVehicle } = useVehicleProfile();
  const { getBadgeCounts } = useBadges();
  const { getCompletedTripCount } = usePublicProfile();
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agreement, setAgreement] = useState<RideAgreement | null>(null);
  const [vehicle, setVehicle] = useState<VehicleProfile | null>(null);
  const [prospectiveDriverId, setProspectiveDriverId] = useState<string | null>(null);
  // The other party's trip/badge counts — only fetched for a pooling
  // 'offer' post's owner-side card, which has no vehicle to show instead.
  const [otherPartyTripCount, setOtherPartyTripCount] = useState(0);
  const [otherPartyBadgeCount, setOtherPartyBadgeCount] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const [showAcceptSheet, setShowAcceptSheet] = useState(false);
  const [showDeclineSheet, setShowDeclineSheet] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myId = session?.user?.id;

  // useAnimatedKeyboard instead of KeyboardAvoidingView/adjustResize — Expo 54
  // targets Android 15 (API 35+), which enforces edge-to-edge and makes
  // windowSoftInputMode="adjustResize" unreliable (no real window resize event
  // to hook into anymore) and the plain RN Keyboard module's height events
  // unreliable under Fabric. reanimated's useAnimatedKeyboard talks to the
  // native keyboard-inset APIs directly and tracks it correctly either way.
  const keyboard = useAnimatedKeyboard();
  const kbSpacerStyle = useAnimatedStyle(() => ({
    marginBottom: Math.max(0, keyboard.height.value - insets.bottom),
  }));

  useEffect(() => {
    load();
    markConversationRead(id);
    pollRef.current = setInterval(refreshMessages, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [conv, msgs] = await Promise.all([getConversationById(id), getMessages(id)]);
      if (!conv) {
        Alert.alert(t.rideDetail.errorTitle, t.messages.loadError);
        router.back();
        return;
      }
      setConversation(conv);
      setMessages(msgs);
      let mine: RideAgreement | null = null;
      if (conv.post && myId) {
        const list = await getAgreementsForPost(conv.post.id);
        mine = list.find((a) => a.rider_id === myId || a.driver_id === myId) ?? null;
        setAgreement(mine);
      }
      // The prospective driver: definitive once an agreement exists
      // (agreement.driver_id). Before that — for an "offer" post the owner
      // is the one offering to drive/haul; for a "request" post (package
      // and hauling are always requests, ride sometimes) it's whoever
      // messaged the owner, since they're presumed to be offering to fulfill it.
      const prospectiveDriver = mine?.driver_id
        ?? (conv.post
          ? (conv.post.type === 'offer' ? conv.post_owner_id : conv.requester_id)
          : null);
      setProspectiveDriverId(prospectiveDriver);
      if (prospectiveDriver && prospectiveDriver !== myId && conv.post) {
        const vehicleKind = conv.post.kind === 'hauling' ? 'hauling' : 'rides_courier';
        const v = await getMyVehicle(prospectiveDriver, vehicleKind);
        setVehicle(v);
      } else {
        setVehicle(null);
      }
      // I'm the driver on a pooling 'offer' post — my review card shows the
      // rider's trips/badges instead of a vehicle (see VehiclePeekCard).
      if (prospectiveDriver === myId && conv.post?.type === 'offer') {
        const otherPartyId = conv.post_owner_id === myId ? conv.requester_id : conv.post_owner_id;
        const [trips, counts] = await Promise.all([
          getCompletedTripCount(otherPartyId),
          getBadgeCounts(otherPartyId),
        ]);
        setOtherPartyTripCount(trips);
        setOtherPartyBadgeCount(counts.reduce((sum, c) => sum + c.count, 0));
      }
    } catch {
      Alert.alert(t.rideDetail.errorTitle, t.messages.loadError);
    } finally {
      setLoading(false);
    }
  }

  async function refreshMessages() {
    try {
      setMessages(await getMessages(id));
    } catch {}
  }

  async function handleSend() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setBody('');
    try {
      const msg = await sendMessage(id, text);
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {
      Alert.alert(t.rideDetail.errorTitle, t.messages.sendError);
      setBody(text);
    } finally {
      setSending(false);
    }
  }

  async function confirmAccept() {
    if (!conversation?.post || !prospectiveDriverId) return;
    setAccepting(true);
    try {
      // Whoever isn't the driver in this conversation is the rider — true
      // regardless of which party's turn it is to click "accept" (post
      // owner for a pooling 'offer' post, or the other party for a 'request').
      const riderId = conversation.post_owner_id === prospectiveDriverId
        ? conversation.requester_id
        : conversation.post_owner_id;
      await createAgreement(conversation.post.id, prospectiveDriverId, riderId);
      // Confirmation pill in the thread — the only side-effect asked for
      // beyond the agreement row itself; deliberately not touching post
      // status/seats or the other pending conversations for this post.
      await sendMessage(id, t.agreement.acceptedSystemMessage, true);
      setShowAcceptSheet(false);
      await load();
    } catch (e: any) {
      Alert.alert(t.rideDetail.errorTitle, e.message);
    } finally {
      setAccepting(false);
    }
  }

  async function confirmDecline() {
    setDeclining(true);
    try {
      await deleteConversation(id);
      router.back();
    } catch (e: any) {
      setDeclining(false);
      Alert.alert(t.rideDetail.errorTitle, e.message);
    }
  }

  if (loading || !conversation) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const isOwner = conversation.post_owner_id === myId;
  const otherParty = isOwner ? conversation.requester : conversation.post_owner;
  const post = conversation.post;
  const status = !agreement
    ? { tone: 'accent' as const, label: t.agreement.statusActive }
    : agreement.status === 'completed'
      ? { tone: 'success' as const, label: t.agreement.statusCompleted }
      : agreement.status === 'cancelled' || agreement.status === 'no_show'
        ? { tone: 'neutral' as const, label: t.calendar.cancelled }
        // Agreement created but not yet completed — same "confirmed" green
        // used by the detail screens' footer text (t.agreement.active,
        // theme.driverText) once an offer is accepted.
        : { tone: 'success' as const, label: t.agreement.statusConfirmed };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 14, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, ...shadows.lg }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
          <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          <Avatar name={otherParty?.full_name ?? '?'} src={otherParty?.avatar_url} size={36} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 15, color: theme.cream, flexShrink: 1 }}>
                {otherParty?.full_name ?? '—'}
              </Text>
              <Badge tone={status.tone} size="sm">{status.label}</Badge>
            </View>
            {post && (
              <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: theme.gold300, marginTop: 1 }}>
                {post.origin_city}{post.destination_city !== post.origin_city ? ` → ${post.destination_city}` : ''}
              </Text>
            )}
          </View>
        </View>
      </LinearGradient>

      <View style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <View style={{ gap: 10, marginBottom: 4 }}>
              {post && (
                <View style={{ alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.cardBorder }}>
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11.5, color: theme.textFaint }}>
                    {post.origin_city}{post.destination_city !== post.origin_city ? ` → ${post.destination_city}` : ''} · {new Date(post.scheduled_at).toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              )}
              <View style={{ alignSelf: 'center', maxWidth: '92%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.md, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.cardBorder }}>
                <Text style={{ fontFamily: fonts.bodyRegular, fontStyle: 'italic', fontSize: 12, color: theme.muted, textAlign: 'center', lineHeight: 17 }}>
                  {t.messages.safetyDisclaimer}
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.textFaint }}>{t.messages.noMessagesYet}</Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.is_system) {
              return (
                <View style={{ alignItems: 'center', marginVertical: 4 }}>
                  <View style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill,
                    backgroundColor: theme.driverSoft, borderWidth: 1, borderColor: theme.driverBorder,
                  }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: theme.driverText, textAlign: 'center' }}>
                      {item.body}
                    </Text>
                  </View>
                </View>
              );
            }
            const mine = item.sender_id === myId;
            return (
              <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <View style={{
                  maxWidth: '78%', borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 11,
                  backgroundColor: mine ? theme.primary : theme.surface,
                  borderWidth: mine ? 0 : 1, borderColor: theme.cardBorder,
                  borderBottomRightRadius: mine ? 4 : radii.lg,
                  borderBottomLeftRadius: mine ? radii.lg : 4,
                  overflow: 'hidden',
                  ...(mine ? shadows.gold : shadows.xs),
                }}>
                  {mine && (
                    <LinearGradient
                      colors={theme.gradientGold as [string, string, ...string[]]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={{
                        position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                        borderRadius: radii.lg, borderBottomRightRadius: 4,
                      }}
                    />
                  )}
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14.5, lineHeight: 20, color: mine ? theme.textOnPrimary : theme.text }}>
                    {renderBodyWithBoldPrice(item.body)}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 10.5, color: theme.textFaint, marginTop: 3, marginHorizontal: 4 }}>
                  {new Date(item.created_at).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />

        {/* Animated marginBottom lifts this whole cluster above the keyboard —
            see the useAnimatedKeyboard hook above for why (edge-to-edge breaks
            adjustResize). Subtracting insets.bottom avoids double-counting the
            gesture-nav gap the input row's own paddingBottom already reserves
            for when the keyboard is closed. */}
        <Animated.View style={kbSpacerStyle}>
          {isOwner && !agreement && post?.type === 'offer' ? (
            // Pooling 'offer' post — I'm the driver reviewing a rider's
            // request. They have no vehicle relevant to this trip, so no
            // vehicle card — just who they are + accept/decline.
            <VehiclePeekCard
              partyName={otherParty?.full_name ?? '—'}
              partyAvatar={otherParty?.avatar_url}
              tripCount={otherPartyTripCount}
              badgeCount={otherPartyBadgeCount}
              theme={theme}
              t={t}
              onAccept={() => setShowAcceptSheet(true)}
              onDecline={() => setShowDeclineSheet(true)}
              accepting={accepting}
            />
          ) : vehicle ? (
            <VehiclePeekCard
              vehicle={vehicle}
              partyName={otherParty?.full_name ?? '—'}
              partyAvatar={otherParty?.avatar_url}
              theme={theme}
              t={t}
              onAccept={isOwner && !agreement ? () => setShowAcceptSheet(true) : undefined}
              onDecline={isOwner && !agreement ? () => setShowDeclineSheet(true) : undefined}
              accepting={accepting}
            />
          ) : null}
          {agreement && (
            <AgreementPanel agreement={agreement} currentUserId={myId!} conversationId={id} theme={theme} t={t} onUpdate={load} />
          )}

          <View style={{
            flexDirection: 'row', alignItems: 'flex-end', gap: 10,
            padding: 12, paddingBottom: insets.bottom + 12,
            borderTopWidth: agreement ? 0 : 1, borderTopColor: theme.cardBorder, backgroundColor: theme.surface,
          }}>
            <View style={{ flex: 1, minHeight: 46, maxHeight: 100, justifyContent: 'center', backgroundColor: theme.surfaceAlt, borderRadius: radii.pill, borderWidth: 1.5, borderColor: theme.border, paddingHorizontal: 16, paddingVertical: 8 }}>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder={t.messages.typeMessage}
                placeholderTextColor={theme.muted}
                multiline
                textAlignVertical="center"
                style={{ fontFamily: fonts.bodyMedium, fontSize: 14.5, lineHeight: 18, color: theme.text, padding: 0, maxHeight: 80 }}
              />
            </View>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!body.trim() || sending}
              style={{
                width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                backgroundColor: body.trim() ? theme.primary : theme.surfaceAlt,
                ...(body.trim() ? shadows.gold : {}),
              }}
            >
              {!!body.trim() && (
                <LinearGradient
                  colors={theme.gradientGold as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 23 }}
                />
              )}
              <Icon name="send" size={18} color={body.trim() ? theme.textOnPrimary : theme.textFaint} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      <ConfirmSheet
        visible={showAcceptSheet}
        tone="success"
        icon="check"
        title={t.agreement.confirmTitle}
        message={t.agreement.confirmMsg}
        confirmLabel={t.agreement.confirm}
        cancelLabel={t.agreement.cancel}
        onConfirm={confirmAccept}
        onCancel={() => setShowAcceptSheet(false)}
        busy={accepting}
      />
      <ConfirmSheet
        visible={showDeclineSheet}
        tone="danger"
        icon="ban"
        title={t.agreement.declineTitle}
        message={t.agreement.declineMsg}
        confirmLabel={t.agreement.decline}
        cancelLabel={t.agreement.cancel}
        onConfirm={confirmDecline}
        onCancel={() => setShowDeclineSheet(false)}
        busy={declining}
      />
    </View>
  );
}
