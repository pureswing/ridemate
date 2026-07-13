import { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useRideAgreements } from '@/hooks/useRideAgreements';
import { useBadges } from '@/hooks/useBadges';
import { ContactReveal, RideAgreement, TripRecord } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeSelector } from '@/components/community/BadgeSelector';
import { TripSummaryModal } from '@/components/ride/TripSummaryModal';

// ── Contact card ──────────────────────────────────────────────────────────────

function ContactItem({ item, onAgreementCreated }: { item: ContactReveal; onAgreementCreated: () => void }) {
  const post = item.post;
  const t = useTranslation();
  const theme = useTheme();
  const { session } = useAuthStore();
  const { createAgreement, getAgreementsForPost } = useRideAgreements();
  const [agreement, setAgreement] = useState<RideAgreement | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (post) loadAgreement();
  }, [post?.id]);

  async function loadAgreement() {
    if (!post) return;
    try {
      const list = await getAgreementsForPost(post.id);
      const mine = list.find(
        (a) => a.rider_id === session?.user?.id || a.driver_id === session?.user?.id
      );
      if (mine) setAgreement(mine);
    } catch {}
  }

  async function handleConfirmRide() {
    if (!post || !session?.user) return;
    Alert.alert(t.agreement.confirmTitle, t.agreement.confirmMsg, [
      { text: t.agreement.cancel, style: 'cancel' },
      {
        text: t.agreement.confirm,
        onPress: async () => {
          setConfirming(true);
          try {
            const ag = await createAgreement(post.id, post.user_id);
            setAgreement(ag);
            onAgreementCreated();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setConfirming(false);
          }
        },
      },
    ]);
  }

  function openContact() {
    if (!post?.contact_value) return;
    const method = post.contact_method;
    if (method === 'whatsapp') {
      Linking.openURL(`whatsapp://send?phone=${post.contact_value.replace(/\D/g, '')}`);
    } else if (method === 'phone') {
      Linking.openURL(`tel:${post.contact_value}`);
    } else if (method === 'email') {
      Linking.openURL(`mailto:${post.contact_value}`);
    }
  }

  if (!post) return null;
  const isOffer = post.type === 'offer';
  const badgeAccent = isOffer ? theme.offer : theme.primary;

  return (
    <View style={{
      backgroundColor: theme.surface,
      borderWidth: 1, borderColor: theme.border,
      borderRadius: 16, padding: 16, marginBottom: 12,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{
          paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99,
          backgroundColor: badgeAccent + '1A',
        }}>
          <Text style={{ fontSize: 11, fontFamily: theme.fontDisplay, color: badgeAccent }}>
            {isOffer ? t.messages.driver : t.messages.passenger}
          </Text>
        </View>
        <Text style={{ color: theme.muted, fontSize: 12 }}>
          {new Date(item.revealed_at).toLocaleDateString(t.locale)}
        </Text>
      </View>

      <Text style={{ fontFamily: theme.fontDisplay, color: theme.text, marginBottom: 4 }}>
        {post.origin_city} → {post.destination_city}
      </Text>
      <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 12 }}>
        {new Date(post.scheduled_at).toLocaleString(t.locale, {
          weekday: 'short', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })}
      </Text>

      {/* Contact action */}
      {post.contact_value && post.contact_method !== 'in_app' ? (
        <TouchableOpacity
          style={{
            backgroundColor: theme.primary + '1A',
            borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
            flexDirection: 'row', alignItems: 'center', marginBottom: 12,
          }}
          onPress={openContact}
        >
          <Icon
            name={
              post.contact_method === 'whatsapp' ? 'whatsapp'
              : post.contact_method === 'phone' ? 'phone'
              : 'email'
            }
            size={16}
            color={theme.primary}
          />
          <Text style={{ color: theme.primary, fontFamily: theme.fontDisplay, flex: 1, marginLeft: 8 }}>
            {post.contact_value}
          </Text>
          <Text style={{ color: theme.primary, fontSize: 12 }}>{t.messages.openArrow}</Text>
        </TouchableOpacity>
      ) : (
        <View style={{
          backgroundColor: theme.surfaceAlt, borderRadius: 12,
          paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12,
        }}>
          <Text style={{ color: theme.muted, fontSize: 13 }}>{t.messages.chatComingSoon}</Text>
        </View>
      )}

      {/* Agreement CTA */}
      {!agreement && (
        <TouchableOpacity
          style={{
            borderWidth: 1, borderColor: theme.offer + '66',
            backgroundColor: theme.offer + '0D',
            borderRadius: 12, paddingVertical: 10, alignItems: 'center',
          }}
          onPress={handleConfirmRide}
          disabled={confirming}
        >
          <Text style={{ color: theme.offer, fontFamily: theme.fontDisplay, fontSize: 13 }}>
            {confirming ? '...' : t.agreement.confirmRide}
          </Text>
        </TouchableOpacity>
      )}

      {agreement && (
        <AgreementCard
          agreement={agreement}
          currentUserId={session?.user?.id ?? ''}
          onUpdate={loadAgreement}
        />
      )}
    </View>
  );
}

// ── Agreement status card ─────────────────────────────────────────────────────

function AgreementCard({
  agreement,
  currentUserId,
  onUpdate,
}: {
  agreement: RideAgreement;
  currentUserId: string;
  onUpdate: () => void;
}) {
  const t = useTranslation();
  const theme = useTheme();
  const { confirmCompletion, reportNoShow, loading } = useRideAgreements();
  const { hasGivenBadges } = useBadges();
  const [showBadges, setShowBadges] = useState(false);
  const [alreadyBadged, setAlreadyBadged] = useState(false);
  const [tripRecord, setTripRecord] = useState<TripRecord | null>(null);

  const isDriver = agreement.driver_id === currentUserId;
  const myRole = isDriver ? 'driver' : 'rider';
  const myConfirmedAt = isDriver ? agreement.driver_confirmed_at : agreement.rider_confirmed_at;
  const otherId = isDriver ? agreement.rider_id : agreement.driver_id;
  const otherName = isDriver
    ? agreement.rider?.full_name ?? '—'
    : agreement.driver?.full_name ?? '—';

  useEffect(() => {
    if (agreement.status === 'completed') {
      hasGivenBadges(agreement.id).then(setAlreadyBadged);
    }
  }, [agreement.status]);

  async function handleMarkComplete() {
    Alert.alert(t.agreement.markCompleteTitle, t.agreement.markCompleteMsg, [
      { text: t.agreement.cancel, style: 'cancel' },
      {
        text: t.agreement.markComplete,
        onPress: async () => {
          try {
            await confirmCompletion(agreement.id, myRole);
            onUpdate();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  async function handleReportNoShow() {
    Alert.alert(t.agreement.reportTitle, t.agreement.reportMsg, [
      { text: t.agreement.cancel, style: 'cancel' },
      {
        text: t.agreement.report,
        style: 'destructive',
        onPress: async () => {
          try {
            await reportNoShow(agreement.id, otherId);
            Alert.alert('', t.agreement.reportedSuccess);
            onUpdate();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
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
      <View style={{ marginTop: 8, gap: 8 }}>
        <View style={{
          backgroundColor: theme.offer + '1A', borderRadius: 12,
          paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center',
        }}>
          <Text style={{ color: theme.offer, fontFamily: theme.fontDisplay, fontSize: 13 }}>
            {t.agreement.completed}
          </Text>
        </View>
        {!alreadyBadged && (
          <TouchableOpacity
            style={{ backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}
            onPress={() => setShowBadges(true)}
          >
            <Text style={{ color: '#fff', fontFamily: theme.fontDisplay, fontSize: 13 }}>
              {t.badges.title} →
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={openTripRecord}
          style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}
        >
          <Text style={{ color: theme.muted, fontSize: 13 }}>{t.tripSummary.title} →</Text>
        </TouchableOpacity>
        <BadgeSelector
          visible={showBadges}
          agreementId={agreement.id}
          receiverId={otherId}
          receiverName={otherName}
          currentRole={myRole}
          onDone={() => { setShowBadges(false); setAlreadyBadged(true); }}
        />
        <TripSummaryModal
          visible={!!tripRecord}
          record={tripRecord}
          onClose={() => setTripRecord(null)}
        />
      </View>
    );
  }

  if (agreement.status === 'no_show') {
    return (
      <View style={{
        backgroundColor: theme.danger + '1A',
        borderWidth: 1, borderColor: theme.danger + '4D',
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginTop: 8,
      }}>
        <Text style={{ color: theme.danger, fontSize: 13, fontFamily: theme.fontDisplay }}>
          {t.agreement.reportTitle} ✓
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 8, gap: 8 }}>
      <View style={{
        backgroundColor: theme.offer + '1A', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center',
      }}>
        <Text style={{ color: theme.offer, fontFamily: theme.fontDisplay, fontSize: 13 }}>
          {myConfirmedAt ? t.agreement.waitingOther : t.agreement.active}
        </Text>
      </View>
      {!myConfirmedAt && (
        <TouchableOpacity
          style={{ backgroundColor: theme.offer, borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}
          onPress={handleMarkComplete}
          disabled={loading}
        >
          <Text style={{ color: '#fff', fontFamily: theme.fontDisplay, fontSize: 13 }}>
            {t.agreement.markComplete}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={{
          borderWidth: 1, borderColor: theme.danger + '66',
          borderRadius: 12, paddingVertical: 10, alignItems: 'center',
        }}
        onPress={handleReportNoShow}
        disabled={loading}
      >
        <Text style={{ color: theme.danger, fontSize: 13, fontFamily: theme.fontDisplay }}>
          {t.agreement.reportNoShow}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const { session } = useAuthStore();
  const t = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [reveals, setReveals] = useState<ContactReveal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    fetchReveals();
  }, [session]);

  async function fetchReveals() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_reveals')
        .select(
          '*, post:ride_posts(id, type, origin_city, destination_city, scheduled_at, contact_method, contact_value, status, user_id)'
        )
        .eq('requester_id', session!.user.id)
        .order('revealed_at', { ascending: false });
      if (error) throw error;
      setReveals((data as ContactReveal[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.primary} />
      ) : (
        <FlatList
          data={reveals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ContactItem item={item} onAgreementCreated={fetchReveals} />
          )}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: theme.primary + '1A',
                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <Icon name="chat" size={36} color={theme.primary} />
              </View>
              <Text style={{ color: theme.text, fontFamily: theme.fontDisplay, fontSize: 18, marginBottom: 8 }}>
                {t.messages.empty}
              </Text>
              <Text style={{ color: theme.muted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 }}>
                {t.messages.emptySubtitle}
              </Text>
            </View>
          }
          refreshing={loading}
          onRefresh={fetchReveals}
        />
      )}
    </View>
  );
}
