import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useRides } from '@/hooks/useRides';
import { useRideAgreements } from '@/hooks/useRideAgreements';
import { useFavorites } from '@/hooks/useFavorites';
import { RidePost } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { RouteMap } from '@/components/ride/RouteMap';
import { AppTheme } from '@/constants/themes';

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const { getPostById, revealContact } = useRides();
  const { createAgreement, getAgreementsForPost } = useRideAgreements();
  const { isFavorited, saveFavorite, removeFavorite } = useFavorites();
  const t = useTranslation();
  const theme = useTheme();

  const [post, setPost] = useState<RidePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactRevealed, setContactRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [agreementExists, setAgreementExists] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (id) loadPost();
  }, [id]);

  async function loadPost() {
    setLoading(true);
    try {
      const data = await getPostById(id);
      setPost(data);
      if (data && session?.user) {
        const [fav, agreements] = await Promise.all([
          isFavorited(data.user_id),
          getAgreementsForPost(data.id),
        ]);
        setFavorited(fav);
        setAgreementExists(
          agreements.some(
            (a) => a.rider_id === session.user.id || a.driver_id === session.user.id
          )
        );
      }
    } catch {
      Alert.alert(t.rideDetail.errorTitle, t.rideDetail.loadError);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevealContact() {
    if (!session?.user || !post) return;
    if (post.user_id === session.user.id) {
      Alert.alert(t.rideDetail.ownAdMsg, t.rideDetail.ownAdAlert);
      return;
    }
    Alert.alert(t.rideDetail.revealTitle, t.rideDetail.revealMsg, [
      { text: t.rideDetail.cancel, style: 'cancel' },
      {
        text: t.rideDetail.viewContactBtn,
        onPress: async () => {
          setRevealing(true);
          try {
            await revealContact(post.id, session.user.id);
            setContactRevealed(true);
          } catch {
            Alert.alert(t.rideDetail.errorTitle, t.rideDetail.revealError);
          } finally {
            setRevealing(false);
          }
        },
      },
    ]);
  }

  async function handleToggleFavorite() {
    if (!post || !session?.user) return;
    setFavLoading(true);
    try {
      if (favorited) {
        Alert.alert(t.favorites.removeConfirmTitle, t.favorites.removeConfirmMsg, [
          { text: t.favorites.cancel, style: 'cancel' },
          {
            text: t.favorites.confirm,
            style: 'destructive',
            onPress: async () => {
              await removeFavorite(post.user_id);
              setFavorited(false);
            },
          },
        ]);
      } else {
        await saveFavorite(post.user_id, post.origin_city);
        setFavorited(true);
      }
    } catch (e: any) {
      if (e.message === 'LIMIT_REACHED') {
        Alert.alert(t.favorites.limitTitle, t.favorites.limitMsg);
      }
    } finally {
      setFavLoading(false);
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

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!post) return null;

  const isOffer = post.type === 'offer';
  const date = new Date(post.scheduled_at);
  const isOwner = post.user_id === session?.user?.id;
  const canEdit = isOwner && (date.getTime() - Date.now() > 2 * 60 * 60 * 1000);
  const canSaveFavorite = !isOwner && isOffer && contactRevealed;
  const canConfirmRide = !isOwner && contactRevealed && !agreementExists;
  const accent = isOffer ? theme.offer : theme.request;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 }}>

        {/* Type badge */}
        <View style={{
          alignSelf: 'flex-start',
          paddingHorizontal: 16, paddingVertical: 8,
          borderRadius: 99, marginBottom: 16,
          backgroundColor: accent + '1A',
        }}>
          <Text style={{ fontFamily: theme.fontDisplay, fontSize: 13, color: accent }}>
            {isOffer ? t.rideDetail.driverOffer : t.rideDetail.passengerRequest}
          </Text>
        </View>

        {/* Route map */}
        <RouteMap
          routeMapUrl={post.route_map_url}
          origin={post.origin_city}
          destination={post.destination_city}
          originLat={post.origin_lat}
          originLng={post.origin_lng}
          destinationLat={post.destination_lat}
          destinationLng={post.destination_lng}
        />

        {/* Route details */}
        <View style={{
          backgroundColor: theme.surface, borderRadius: 16,
          borderWidth: 1, borderColor: theme.border,
          padding: 20, marginBottom: 16,
        }}>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, color: theme.muted, fontFamily: theme.fontDisplay, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>
              {t.rideDetail.origin}
            </Text>
            <Text style={{ fontSize: 20, fontFamily: theme.fontDisplay, color: theme.text }}>
              {post.origin_city}
            </Text>
            {post.origin_address && (
              <Text style={{ color: theme.textSecondary, marginTop: 2 }}>{post.origin_address}</Text>
            )}
          </View>
          <Text style={{ color: theme.muted, fontSize: 22, textAlign: 'center', marginBottom: 16 }}>↓</Text>
          <View>
            <Text style={{ fontSize: 11, color: theme.muted, fontFamily: theme.fontDisplay, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>
              {t.rideDetail.destination}
            </Text>
            <Text style={{ fontSize: 20, fontFamily: theme.fontDisplay, color: theme.text }}>
              {post.destination_city}
            </Text>
            {post.destination_address && (
              <Text style={{ color: theme.textSecondary, marginTop: 2 }}>{post.destination_address}</Text>
            )}
          </View>
        </View>

        {/* Ride details */}
        <View style={{
          backgroundColor: theme.surface, borderRadius: 16,
          borderWidth: 1, borderColor: theme.border,
          padding: 20, marginBottom: 16,
        }}>
          <Text style={{ fontFamily: theme.fontDisplay, color: theme.text, fontSize: 15, marginBottom: 12 }}>
            {t.rideDetail.details}
          </Text>
          <Detail theme={theme} label={t.rideDetail.date}
            value={date.toLocaleDateString(t.locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
          <Detail theme={theme} label={t.rideDetail.time}
            value={date.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })} />
          {isOffer && post.seats_available && (
            <Detail theme={theme} label={t.rideDetail.seats} value={String(post.seats_available)} />
          )}
          {post.suggested_donation && (
            <Detail theme={theme} label={t.rideDetail.donation} value={`$${post.suggested_donation} USD`} />
          )}
          {post.description && (
            <Detail theme={theme} label={t.rideDetail.notes} value={post.description} />
          )}
          <Detail theme={theme} label={t.rideDetail.postedBy} value={post.profile?.full_name ?? '—'} last />
        </View>

        {/* Warning */}
        <View style={{
          backgroundColor: theme.warning + '1A',
          borderWidth: 1, borderColor: theme.warning + '4D',
          borderRadius: 12, padding: 16, marginBottom: 24,
        }}>
          <Text style={{ color: theme.warning, fontSize: 13, fontFamily: theme.fontDisplay, marginBottom: 4 }}>
            {t.rideDetail.warningTitle}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 20 }}>
            {t.rideDetail.warningText}
          </Text>
        </View>

        {/* Owner notice + edit button */}
        {isOwner && (
          <View style={{ gap: 10 }}>
            {canEdit ? (
              <TouchableOpacity
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: theme.primary + '1A',
                  borderWidth: 1, borderColor: theme.primary + '40',
                  borderRadius: 14, paddingVertical: 13,
                }}
                onPress={() => router.push(`/ride/edit/${post.id}`)}
              >
                <Icon name="edit" size={16} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: theme.fontDisplay, fontSize: 14 }}>
                  Edit post
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: theme.surfaceAlt, borderRadius: 12,
                paddingHorizontal: 16, paddingVertical: 10,
              }}>
                <Icon name="lock" size={14} color={theme.muted} />
                <Text style={{ color: theme.muted, fontSize: 13 }}>
                  {t.rideDetail.yourAd} · Editing locked (&lt; 2h to pickup)
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Non-owner actions */}
        {!isOwner && (
          <View style={{ gap: 12 }}>
            {contactRevealed && post.contact_value ? (
              <TouchableOpacity
                style={{
                  backgroundColor: theme.offer, borderRadius: 16,
                  paddingVertical: 16, alignItems: 'center',
                }}
                onPress={openContact}
              >
                <Text style={{ color: '#fff', fontFamily: theme.fontDisplay, fontSize: 15 }}>
                  {post.contact_method === 'whatsapp' ? t.rideDetail.openWhatsApp
                    : post.contact_method === 'phone' ? t.rideDetail.call
                    : post.contact_method === 'email' ? t.rideDetail.sendEmail
                    : t.rideDetail.contactBtn}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>
                  {post.contact_value}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary, borderRadius: 16,
                  paddingVertical: 16, alignItems: 'center',
                }}
                onPress={handleRevealContact}
                disabled={revealing}
              >
                <Text style={{ color: '#fff', fontFamily: theme.fontDisplay, fontSize: 15 }}>
                  {revealing ? t.rideDetail.processing : t.rideDetail.viewContact}
                </Text>
              </TouchableOpacity>
            )}

            {canSaveFavorite && (
              <TouchableOpacity
                style={{
                  borderRadius: 16, paddingVertical: 12, alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: favorited ? theme.primary : theme.border,
                  backgroundColor: favorited ? theme.primary + '1A' : theme.surface,
                }}
                onPress={handleToggleFavorite}
                disabled={favLoading}
              >
                <Text style={{ fontFamily: theme.fontDisplay, color: favorited ? theme.primary : theme.text }}>
                  {favorited ? t.favorites.saved : t.favorites.save}
                </Text>
              </TouchableOpacity>
            )}

            {canConfirmRide && (
              <TouchableOpacity
                style={{
                  backgroundColor: theme.offer + '1A',
                  borderWidth: 1, borderColor: theme.offer + '4D',
                  borderRadius: 16, paddingVertical: 12, alignItems: 'center',
                }}
                onPress={handleConfirmRide}
                disabled={confirming}
              >
                <Text style={{ color: theme.offer, fontFamily: theme.fontDisplay }}>
                  {confirming ? '...' : t.agreement.confirmRide}
                </Text>
              </TouchableOpacity>
            )}

            {agreementExists && !isOwner && (
              <View style={{
                backgroundColor: theme.offer + '1A', borderRadius: 12,
                paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center',
              }}>
                <Text style={{ color: theme.offer, fontFamily: theme.fontDisplay }}>
                  {t.agreement.active}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Detail({ label, value, theme, last = false }: {
  label: string; value: string; theme: AppTheme; last?: boolean;
}) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingVertical: 10,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.border,
    }}>
      <Text style={{ color: theme.muted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 13, fontFamily: theme.fontDisplay, flex: 1, textAlign: 'right', marginLeft: 16 }}>
        {value}
      </Text>
    </View>
  );
}
