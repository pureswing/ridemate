import { useState } from 'react';
import { View, TouchableOpacity, Modal, Alert, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Switch } from '@/components/ui/Switch';
import { BadgeGlyph } from './BadgeGlyph';
import { BadgeDetail } from './BadgeDetail';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { useBadges } from '@/hooks/useBadges';
import { useFavorites } from '@/hooks/useFavorites';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { BadgeType, DriverBadgeType, PassengerBadgeType, RidePostKind } from '@/types';
import { BADGE_ICONS } from '@/constants/badgeIcons';
import { fonts, radii, shadows } from '@/constants/themes';

const DRIVER_BADGES: DriverBadgeType[] = [
  'punctual', 'clean_car', 'friendly', 'good_music', 'fresh_air',
  'shares_snacks', 'pet_friendly', 'vip_service', 'good_navigation',
  'flexible_hours', 'city_expert', 'careful_cargo', 'fast_delivery', 'great_chat',
];
const PASSENGER_BADGES: PassengerBadgeType[] = ['on_time', 'respectful', 'tidy', 'communicative', 'great_chat'];

interface Props {
  visible: boolean;
  agreementId: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  receiverVerified?: boolean;
  // Role of the CURRENT user — determines which badge set to show, and
  // (since only a rider ever has a driver worth saving) whether the
  // "Save as trusted driver" toggle appears at all.
  currentRole: 'driver' | 'rider';
  kind: RidePostKind;
  originCity: string;
  destinationCity: string;
  scheduledAt: string;
  // How many more completions are queued behind this one — CompletionGate's
  // stack. Omitted (or 0) outside that context, e.g. the manual
  // mark-complete flow, which only ever has the one.
  queueRemaining?: number;
  onDone: () => void;
  // CompletionGate's app-open auto-prompt fires before the user ever
  // pressed "Mark as completed" — this confirms their side of the
  // agreement as part of sending, so the flow ends in the same state
  // either way. The manual mark-complete flow already confirms before
  // opening this modal, so it doesn't need to pass this.
  onBeforeSend?: () => Promise<void>;
}

const OTHER = '__other__';

// Mandatory — no skip/dismiss. Triggered by "Mark as completed" (immediately,
// not waiting on the other party — see 034_completion_badges.sql for the
// matching RLS relaxation) and by CompletionGate's app-open auto-prompt for
// jobs left un-marked 2+ hours past their ETA. Since it can't be dismissed
// without picking at least one badge (or "Other"), closing is only ever a
// side effect of a successful send. Matches
// ui_kits/ridemate-app/JobCompletionReview.jsx.
export function BadgeSelector({
  visible, agreementId, receiverId, receiverName, receiverAvatar, receiverVerified,
  currentRole, kind, originCity, destinationCity, scheduledAt, queueRemaining = 0,
  onDone, onBeforeSend,
}: Props) {
  const t = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { giveBadges, loading } = useBadges();
  const { saveFavorite } = useFavorites();
  const { blockUser } = useBlockedUsers();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openBadge, setOpenBadge] = useState<BadgeType | null>(null);
  const [saveDriver, setSaveDriver] = useState(false);
  const [blockToggle, setBlockToggle] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);

  // Rider reviewing a driver → offer to save them as trusted. Driver
  // reviewing a rider → no such thing, that toggle never appears.
  const otherIsDriver = currentRole === 'rider';
  const badgeSet: BadgeType[] = otherIsDriver ? DRIVER_BADGES : PASSENGER_BADGES;
  const isOtherActive = selected.has(OTHER);
  const kindWord = kind === 'hauling' ? t.badges.haulingCompleted : kind === 'package' ? t.badges.deliveryCompleted : t.badges.jobCompleted;

  function toggleBadge(badge: BadgeType) {
    if (isOtherActive) return; // positive badges lock while "Other" is active
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(badge)) next.delete(badge);
      else next.add(badge);
      return next;
    });
    setOpenBadge((prev) => (prev === badge ? null : badge));
  }

  function toggleOther() {
    setSelected((prev) => (prev.has(OTHER) ? new Set() : new Set([OTHER])));
    setOpenBadge(null);
  }

  async function handleSend() {
    if (selected.size === 0) return;
    setSending(true);
    try {
      if (onBeforeSend) await onBeforeSend();

      const realBadges = Array.from(selected).filter((b) => b !== OTHER) as BadgeType[];
      if (realBadges.length > 0) await giveBadges(agreementId, receiverId, realBadges);

      if (saveDriver && otherIsDriver) {
        try {
          await saveFavorite(receiverId, originCity);
        } catch {
          // Favorites cap or already-saved — not worth blocking completion over.
        }
      }
      if (blockToggle) {
        try {
          await blockUser(receiverId);
        } catch {}
      }

      setSelected(new Set());
      setOpenBadge(null);
      setSaveDriver(false);
      setBlockToggle(false);
      setFeedback('');
      onDone();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSending(false);
    }
  }

  const dateStr = scheduledAt
    ? new Date(scheduledAt).toLocaleDateString(t.locale, { month: 'short', day: 'numeric' })
    : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: 'rgba(10,8,6,0.62)', justifyContent: 'flex-end' }}>
        <View style={{
          maxHeight: '88%', backgroundColor: theme.background,
          borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
          ...shadows.lg,
        }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 22, paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* header */}
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <Avatar name={receiverName} src={receiverAvatar} size={64} verified={receiverVerified} style={{ marginBottom: 10 }} />
            <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: theme.textFaint }}>
              {kindWord}
            </Text>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 19, color: theme.text, textAlign: 'center', marginTop: 4 }}>
              {t.badges.howWasItWith} {receiverName}?
            </Text>
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12.5, color: theme.muted, marginTop: 3, textAlign: 'center' }}>
              {originCity}{destinationCity !== originCity ? ` → ${destinationCity}` : ''}{dateStr ? ` · ${dateStr}` : ''}
            </Text>
          </View>

          {/* badges — required, multi-select */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: theme.text, marginBottom: 10 }}>
              {t.badges.giveAtLeastOne} <Text style={{ color: theme.danger }}>*</Text>
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-evenly' }}>
              {badgeSet.map((badge) => {
                const on = selected.has(badge);
                const meta = BADGE_ICONS[badge];
                return (
                  <TouchableOpacity
                    key={badge}
                    onPress={() => toggleBadge(badge)}
                    disabled={isOtherActive}
                    activeOpacity={0.8}
                    style={{ alignItems: 'center', width: 64, opacity: isOtherActive ? 0.4 : 1 }}
                  >
                    <BadgeGlyph badge={badge} size={50} color={on ? meta.color : theme.textFaint} />
                    <Text
                      numberOfLines={2}
                      style={{ fontFamily: fonts.bodyMedium, fontSize: 10.5, textAlign: 'center', lineHeight: 13, color: on ? meta.color : theme.muted, marginTop: 4 }}
                    >
                      {t.badges[badge]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity onPress={toggleOther} activeOpacity={0.8} style={{ alignItems: 'center', width: 64 }}>
                <View style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 1.75, borderColor: isOtherActive ? theme.passengerText : theme.textFaint, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="ban" size={22} color={isOtherActive ? theme.passengerText : theme.textFaint} />
                </View>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 10.5, textAlign: 'center', color: isOtherActive ? theme.passengerText : theme.muted, marginTop: 4 }}>
                  {t.badges.otherLabel}
                </Text>
              </TouchableOpacity>
            </View>
            {openBadge && selected.has(openBadge) && <BadgeDetail badge={openBadge} />}
          </View>

          {/* save driver — optional, rider side only */}
          {otherIsDriver && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              padding: 14, borderRadius: radii.md, borderWidth: 1, borderColor: theme.cardBorder,
              backgroundColor: theme.surfaceAlt, marginBottom: 14,
            }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="passenger" size={17} color={theme.text} />
              </View>
              <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 13.5, color: theme.text }}>
                {t.badges.saveDriverPrefix} {receiverName} {t.badges.saveDriverSuffix}
              </Text>
              <Switch checked={saveDriver} onChange={setSaveDriver} />
            </View>
          )}

          {/* feedback — only once "Other" is flagged; optional */}
          {isOtherActive && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: theme.text, marginBottom: 6 }}>
                {t.badges.whatHappened} <Text style={{ fontFamily: fonts.bodyMedium, color: theme.textFaint }}>{t.badges.optional}</Text>
              </Text>
              <TextInput
                value={feedback}
                onChangeText={setFeedback}
                placeholder={t.badges.feedbackPlaceholder}
                placeholderTextColor={theme.muted}
                multiline
                style={{
                  minHeight: 68, padding: 12, borderRadius: radii.md, borderWidth: 1, borderColor: theme.border,
                  backgroundColor: theme.surface, fontFamily: fonts.bodyRegular, fontSize: 13, color: theme.text,
                  textAlignVertical: 'top',
                }}
              />
            </View>
          )}

          {/* block — only once "Other" is flagged; optional */}
          {isOtherActive && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              padding: 14, borderRadius: radii.md, borderWidth: 1, borderColor: theme.danger + '40',
              backgroundColor: theme.danger + '0F', marginBottom: 14,
            }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="ban" size={17} color={theme.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: theme.text }}>
                  {t.badges.blockPrefix} {receiverName}
                </Text>
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint, marginTop: 1 }}>
                  {t.badges.blockCaption}
                </Text>
              </View>
              <Switch checked={blockToggle} onChange={setBlockToggle} />
            </View>
          )}

          <TouchableOpacity
            onPress={handleSend}
            disabled={loading || sending || selected.size === 0}
            style={{
              backgroundColor: theme.primary, borderRadius: radii.lg, paddingVertical: 16, alignItems: 'center',
              opacity: loading || sending || selected.size === 0 ? 0.5 : 1,
            }}
          >
            {loading || sending ? (
              <ActivityIndicator color={theme.textOnPrimary} />
            ) : (
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15.5, color: theme.textOnPrimary }}>{t.badges.submit}</Text>
            )}
          </TouchableOpacity>
          {queueRemaining > 0 && (
            <Text style={{ textAlign: 'center', fontFamily: fonts.bodyMedium, fontSize: 11.5, color: theme.textFaint, marginTop: 10 }}>
              {queueRemaining} {t.badges.moreToReview}
            </Text>
          )}
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
