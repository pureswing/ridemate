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
import { CardBox } from '@/components/ui/CardBox';
import { RuleChip } from '@/components/ui/RuleChip';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useRides } from '@/hooks/useRides';
import { useRideAgreements } from '@/hooks/useRideAgreements';
import { useMessages } from '@/hooks/useMessages';
import { useBadges } from '@/hooks/useBadges';
import { RidePost, RidePostDetailsPackage } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatLeavesIn, formatEta } from '@/utils/dateFormat';
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
      <Badge tone={tone} icon="location" size="sm" iconSize={12} style={{ alignSelf: 'flex-start', marginBottom: 8 }}>{label}</Badge>
      <View style={{ backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13 }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.text }}>{value}</Text>
      </View>
    </View>
  );
}

function DetailRow({ label, value, theme, last = false }: {
  label: string; value: string; theme: ReturnType<typeof useTheme>; last?: boolean;
}) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingVertical: 11,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.border,
    }}>
      <Text style={{ color: theme.muted, fontSize: 13, fontFamily: fonts.bodyMedium }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 13, fontFamily: fonts.bodyBold, flex: 1, textAlign: 'right', marginLeft: 16 }}>
        {value}
      </Text>
    </View>
  );
}

export default function PackageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const { getPostById } = useRides();
  const { createAgreement, getAgreementsForPost } = useRideAgreements();
  const { findConversation, getOrCreateConversation } = useMessages();
  const { getBadgeCounts } = useBadges();
  const t = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [post, setPost] = useState<RidePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [messaged, setMessaged] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [agreementExists, setAgreementExists] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [posterBadgeCount, setPosterBadgeCount] = useState<number | null>(null);

  useEffect(() => {
    if (id) loadPost();
  }, [id]);

  async function loadPost() {
    setLoading(true);
    try {
      const data = await getPostById(id);
      setPost(data);
      if (data) {
        const tasks: Promise<any>[] = [
          getBadgeCounts(data.user_id).then((counts) => setPosterBadgeCount(counts.reduce((sum, c) => sum + c.count, 0))),
        ];
        if (session?.user) {
          tasks.push(
            getAgreementsForPost(data.id).then((agreements) => setAgreementExists(
              agreements.some((a) => a.rider_id === session.user.id || a.driver_id === session.user.id)
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

  async function handleMessage() {
    if (!session?.user || !post) return;
    if (post.user_id === session.user.id) {
      Alert.alert(t.rideDetail.ownAdMsg, t.rideDetail.ownAdAlert);
      return;
    }
    setMessaging(true);
    try {
      const conv = await getOrCreateConversation(post.id, post.user_id);
      setMessaged(true);
      router.push({ pathname: '/messages/[id]', params: { id: conv.id } });
    } catch {
      Alert.alert(t.rideDetail.errorTitle, t.messages.sendError);
    } finally {
      setMessaging(false);
    }
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
            await createAgreement(post.id, post.user_id);
            setAgreementExists(true);
          } catch (e: any) {
            Alert.alert(t.rideDetail.errorTitle, e.message);
          } finally {
            setConfirming(false);
          }
        },
      },
    ]);
  }

  function handleShare() {
    if (!post) return;
    Share.share({ message: `${post.origin_city} → ${post.destination_city} — ${t.rideDetail.shareMessage}` });
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
  const canConfirmRide = !isOwner && messaged && !agreementExists;
  const accent = theme.courierText;

  const details = (post.details ?? {}) as RidePostDetailsPackage;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <ScrollView style={{ flex: 1 }} removeClippedSubviews={false} contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={{ height: 240, backgroundColor: theme.surfaceAlt, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden', ...shadows.lg }}>
          {post.route_map_url ? (
            <Image source={{ uri: post.route_map_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
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
            <SummaryChip theme={theme} label={t.rideDetail.leaves} value={formatLeavesIn(post.scheduled_at)} />
            <SummaryChip theme={theme} label={t.rideDetail.duration} value={post.duration_text ?? '—'} />
            <SummaryChip theme={theme} label={t.rideDetail.distance} value={post.distance_text ?? '—'} />
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Badge tone="courier" icon="package" iconSize={13}>{t.post.chooserPackageTitle}</Badge>
            {post.suggested_donation != null && (
              <Badge tone="warning" style={{ marginLeft: 'auto' }}>{`$${post.suggested_donation} OBO`}</Badge>
            )}
          </View>

          <View style={{ gap: 12 }}>
            <AddressRow theme={theme} tone="driver" label={t.rideDetail.origin} value={post.origin_address || post.origin_city} />
            <AddressRow theme={theme} tone="passenger" label={t.rideDetail.destination} value={post.destination_address || post.destination_city} />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatTile theme={theme} icon="event" label={t.rideDetail.date}
              value={date.toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })} />
            <StatTile theme={theme} icon="schedule" label={t.rideDetail.time}
              value={date.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })} />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatTile theme={theme} icon="package" label="Qty" value={String(details.qty ?? 1)} />
            <StatTile theme={theme} icon="navigation" label={t.rideDetail.eta} value={formatEta(post.scheduled_at, post.duration_seconds, t.locale)} />
          </View>

          <Card padding={14} elevation="sm">
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

          {post.description && (
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.textSecondary, lineHeight: 20 }}>
              {post.description}
            </Text>
          )}

          {/* Package details */}
          <Field label="Package details">
            <CardBox style={{ paddingVertical: 2 }}>
              {!!details.packageSize && <DetailRow theme={theme} label="Size" value={details.packageSize} />}
              {!!details.declaredValue && <DetailRow theme={theme} label="Declared value" value={`$${details.declaredValue}`} />}
              <DetailRow theme={theme} label="OK to inspect" value={details.inspectionOk ? 'Yes' : 'No'} last={!details.oathAccepted} />
              {details.oathAccepted && <DetailRow theme={theme} label="Prohibited items" value="Confirmed none included" last />}
            </CardBox>
          </Field>

          {(details.contentTags?.length ?? 0) > 0 && (
            <Field label="What's inside">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {details.contentTags!.map((c) => (
                  <RuleChip key={c} active accent={accent} theme={theme} onPress={() => {}}>{c}</RuleChip>
                ))}
              </View>
            </Field>
          )}

          {(details.handling?.length ?? 0) > 0 && (
            <Field label="Handling instructions">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {details.handling!.map((h) => (
                  <RuleChip key={h} active accent={accent} theme={theme} onPress={() => {}}>{h}</RuleChip>
                ))}
              </View>
            </Field>
          )}

          <View style={{
            flexDirection: 'row', gap: 10,
            backgroundColor: theme.warning + '1A',
            borderWidth: 1, borderColor: theme.warning + '4D',
            borderRadius: 14, padding: 16,
          }}>
            <Icon name="warning" size={18} color={theme.warning} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.warning, fontSize: 13, fontFamily: fonts.bodyBold, marginBottom: 4 }}>
                {t.rideDetail.warningTitle}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12.5, fontFamily: fonts.bodyRegular, lineHeight: 19 }}>
                {t.rideDetail.warningText}
              </Text>
            </View>
          </View>

          {isOwner && (
            <View style={{ gap: 10 }}>
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
              {agreementExists && (
                <View style={{
                  backgroundColor: theme.driverText + '1A', borderRadius: 14,
                  paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center',
                }}>
                  <Text style={{ color: theme.driverText, fontFamily: fonts.bodyBold, fontSize: 13.5 }}>
                    {t.agreement.active}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {!isOwner && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 14,
          backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.cardBorder,
          paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 14,
          ...shadows.lg,
        }}>
          {agreementExists ? (
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: theme.driverText }}>{t.agreement.active}</Text>
          ) : canConfirmRide ? (
            <Button variant="ghost" textColor={theme.driverText} disabled={confirming} onPress={handleConfirmRide}>
              {confirming ? t.rideDetail.processing : t.agreement.confirmRide}
            </Button>
          ) : (
            <View style={{ width: 1 }} />
          )}

          <View style={{ flex: 1 }}>
            <Button variant="primary" size="lg" fullWidth disabled={messaging} onPress={handleMessage}>
              {messaging ? t.rideDetail.processing : t.rideDetail.sendMessage}
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}
