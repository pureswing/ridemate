import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';
import { CardBox } from '@/components/ui/CardBox';
import { RowDivider } from '@/components/ui/RowDivider';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { MembershipCheckoutSheet } from '@/components/profile/MembershipCheckoutSheet';
import { useAuthStore } from '@/store/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { fonts, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import {
  TIER_ICON, TIER_COLOR, PLAN_FEATURES,
  DONOR_AMOUNTS, DONOR_SUGGESTED_AMOUNT, DONOR_AMOUNT_MIN, DONOR_AMOUNT_MAX, DONOR_CONFIRM_THRESHOLD,
} from '@/constants/membershipPlans';

// Ported from ui_kits/ridemate-app/Membership.jsx + MembershipShared.jsx —
// Plan tab only (no Billing/Rewards tab bar; those depend on coupon/referral/
// milestone tables that don't exist yet, out of scope for this pass), and
// donation-only (no Subscriber tier — a $10 payer and a $20 payer cost the
// platform the same, so the tier split only added complexity, not margin).
// UI-only mock: "donations" are a local-only optimistic Subscription update
// on useAuthStore, never persisted to Supabase — RLS only allows clients to
// SELECT that table, real writes would need a server-side webhook.
export default function MembershipScreen() {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile, subscription, setSubscription } = useAuthStore();
  const { tier, isFree, daysRemaining } = useSubscription();

  const [selectedAmount, setSelectedAmount] = useState(DONOR_SUGGESTED_AMOUNT);
  // Paid users don't see the amount picker by default (they see BadgeExplainer
  // instead) — only after tapping "Change monthly amount" on CurrentPlanCard.
  // Free users always see it; see `pickerVisible` below.
  const [adjustingAmount, setAdjustingAmount] = useState(false);
  const [confirmingAmount, setConfirmingAmount] = useState(false);
  const [checkout, setCheckout] = useState<'new' | 'adjust' | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const firstName = profile?.full_name?.split(' ')[0] ?? '';
  const currentAmount = subscription?.amount_donated ?? DONOR_SUGGESTED_AMOUNT;
  const renewsOn = subscription?.period_end
    ? new Date(subscription.period_end).toLocaleDateString(t.locale, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const pickerVisible = isFree || adjustingAmount;
  const pickerTitle = isFree ? t.membership.choosePlan : t.membership.changeAmount;
  const ctaLabel = `${isFree ? t.membership.becomeDonorTitle : t.membership.changeAmount} — $${selectedAmount}${t.membership.perMonth}`;

  function applySubscription(status: 'active' | 'free', amountDonated?: number) {
    const now = new Date();
    setSubscription({
      id: subscription?.id ?? 'local-mock',
      user_id: subscription?.user_id ?? profile?.id ?? 'local-mock',
      status,
      plan: status === 'active' ? 'donor' : undefined,
      amount_donated: amountDonated,
      period_start: status === 'active' ? now.toISOString() : undefined,
      period_end: status === 'active' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      created_at: subscription?.created_at ?? now.toISOString(),
    });
  }

  function handleCtaPress() {
    if (selectedAmount > DONOR_CONFIRM_THRESHOLD) {
      setConfirmingAmount(true);
    } else {
      openCheckout();
    }
  }

  function openCheckout() {
    setConfirmingAmount(false);
    setCheckout(isFree ? 'new' : 'adjust');
  }

  function handleChangeAmountPress() {
    setSelectedAmount(currentAmount);
    setAdjustingAmount(true);
  }

  function handleConfirm(confirmedAmount: number) {
    applySubscription('active', confirmedAmount);
    setCheckout(null);
    setAdjustingAmount(false);
  }

  function handleCancelDowngrade() {
    applySubscription('free');
    setConfirmingCancel(false);
  }

  const FEATURE_LABELS: Record<string, string> = {
    postBrowse: t.membership.featurePostBrowse,
    messaging: t.membership.featureMessaging,
    savedAddresses: t.membership.featureSavedAddresses,
    earlyAccess: t.membership.featureEarlyAccess,
  };
  const FEATURE_TEXT: Record<string, { free: string; paid: string }> = {
    savedAddresses: { free: t.membership.featureSavedAddressesFree, paid: t.membership.featureSavedAddressesPaid },
  };

  function FeatureCell({ value, text }: { value: boolean; text?: string }) {
    if (text != null) {
      return (
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: theme.text, textAlign: 'center' }}>{text}</Text>
      );
    }
    return <Icon name={value ? 'check' : 'close'} size={16} color={value ? theme.success : theme.textFaint} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        // zIndex/elevation so scrolled content sliding up behind this header
        // (see the ScrollView's negative marginTop below) is actually painted
        // underneath it, not on top — Android in particular needs the explicit
        // elevation, sibling order alone isn't enough once both are stacking.
        style={{ paddingTop: insets.top + 8, paddingBottom: 24, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg, zIndex: 10, elevation: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {t.membership.eyebrow}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ alignItems: 'center', marginTop: 14 }}>
          <View style={{ width: 60, height: 60, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', ...shadows.gold }}>
            {tier === 'donor' ? (
              <View style={{ flex: 1, width: '100%', backgroundColor: theme.donorText, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={TIER_ICON.donor} size={28} color="#FFFFFF" />
              </View>
            ) : (
              <View style={{ flex: 1, width: '100%', backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={TIER_ICON.free} size={28} color="#FFFFFF" />
              </View>
            )}
          </View>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 21, letterSpacing: letterSpacingFor(21, tracking.tight), color: theme.cream, marginTop: 10, textAlign: 'center' }}>
            {isFree ? t.membership.headlineFree : `${t.membership.headlinePaidPrefix} ${firstName}!`}
          </Text>
        </View>
      </LinearGradient>

      {/* Pulled up under the header's rounded bottom edge (same technique as
          the tabs Profile screen's floating stats card) — at rest the top
          card still sits flush below the header thanks to the matching extra
          paddingTop below, but scrolling now has room to slide it up behind
          the header's shadow instead of stopping dead at the header's edge. */}
      <View style={{ flex: 1, marginTop: -20 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, gap: 20, paddingBottom: 40 }}>
        {!isFree && (
          <Card padding={16} radius={18} elevation="lg">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: TIER_COLOR.donor.soft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={TIER_ICON.donor} size={19} color={TIER_COLOR.donor.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: letterSpacingFor(10.5, tracking.wide), color: theme.textFaint }}>
                  {t.membership.currentPlan}
                </Text>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, color: theme.text, marginTop: 2 }}>
                  {t.subscription.donor}
                </Text>
              </View>
            </View>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.muted, marginTop: 10 }}>
              {`$${currentAmount}${t.membership.perMonth} · ${t.membership.renews} ${renewsOn}`}
            </Text>
            {!adjustingAmount && (
              <View style={{ marginTop: 14 }}>
                <Button variant="outline" size="md" fullWidth onPress={handleChangeAmountPress}>
                  {t.membership.changeAmount}
                </Button>
              </View>
            )}
            <TouchableOpacity onPress={() => setConfirmingCancel(true)} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: theme.danger }}>
                {t.membership.cancelDowngrade}
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        <View>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: theme.text, marginBottom: 12 }}>
            {t.membership.featuresTitle}
          </Text>
          <CardBox>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
              <View style={{ flex: 1 }} />
              <Text style={{ width: 48, fontFamily: fonts.bodyExtraBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: letterSpacingFor(10, tracking.wide), color: theme.textFaint, textAlign: 'center' }}>
                {t.membership.colFree}
              </Text>
              <Text style={{ width: 48, fontFamily: fonts.bodyExtraBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: letterSpacingFor(10, tracking.wide), color: theme.gold500, textAlign: 'center' }}>
                {t.membership.colPaid}
              </Text>
            </View>
            <RowDivider theme={theme} />
            {PLAN_FEATURES.map((row, i) => (
              <View key={row.key}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
                  <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.text, paddingRight: 8 }}>
                    {FEATURE_LABELS[row.key]}
                  </Text>
                  <View style={{ width: 48, alignItems: 'center' }}>
                    <FeatureCell value={row.free} text={row.hasText ? FEATURE_TEXT[row.key]?.free : undefined} />
                  </View>
                  <View style={{ width: 48, alignItems: 'center' }}>
                    <FeatureCell value={row.paid} text={row.hasText ? FEATURE_TEXT[row.key]?.paid : undefined} />
                  </View>
                </View>
                {i < PLAN_FEATURES.length - 1 && <RowDivider theme={theme} />}
              </View>
            ))}
          </CardBox>
        </View>

        {pickerVisible ? (
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: theme.text }}>
              {pickerTitle}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: theme.text }}>
                {t.membership.donorAmountLabel}
              </Text>
              <Badge tone="warning" size="sm">{`${t.membership.suggested}: $${DONOR_SUGGESTED_AMOUNT}`}</Badge>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {DONOR_AMOUNTS.map((amt) => (
                <Chip
                  key={amt}
                  selected={selectedAmount === amt}
                  onPress={() => setSelectedAmount(amt)}
                  color={[theme.donorText, theme.donorText]}
                  shadow={shadows.donorTight}
                >
                  {`$${amt}`}
                </Chip>
              ))}
            </View>
            <Input
              placeholder={t.membership.donorAmountCustom}
              hint={t.membership.amountHint}
              prefix="$"
              keyboardType="number-pad"
              value={String(selectedAmount)}
              onChangeText={(v) => setSelectedAmount(Math.min(DONOR_AMOUNT_MAX, Number(v.replace(/[^0-9]/g, '')) || 0))}
            />
            <Button variant="primary" size="lg" fullWidth onPress={handleCtaPress} disabled={selectedAmount < DONOR_AMOUNT_MIN}>
              {ctaLabel}
            </Button>
            {isFree ? (
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.textFaint, textAlign: 'center', lineHeight: 17 }}>
                {t.membership.choosePlanFooter}
              </Text>
            ) : (
              <TouchableOpacity onPress={() => setAdjustingAmount(false)} style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: theme.muted }}>
                  {t.membership.keepPlan}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Card padding={16} radius={18} elevation="lg" backgroundColor={TIER_COLOR.donor.soft} borderColor={TIER_COLOR.donor.border}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Icon name={TIER_ICON.donor} size={18} color={TIER_COLOR.donor.text} />
              <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.textSecondary, lineHeight: 19 }}>
                {t.membership.badgeExplainerDonor}
              </Text>
            </View>
          </Card>
        )}
        </ScrollView>
      </View>

      <MembershipCheckoutSheet
        visible={checkout != null}
        amount={selectedAmount}
        mode={checkout ?? 'new'}
        onClose={() => setCheckout(null)}
        onConfirm={handleConfirm}
      />

      <ConfirmSheet
        visible={confirmingAmount}
        tone="success"
        icon="heart"
        title={t.membership.confirmAmountTitle}
        message={`${t.membership.confirmAmountPrefix} $${selectedAmount} ${t.membership.confirmAmountSuffix}`}
        confirmLabel={t.membership.confirmAmountConfirm}
        cancelLabel={t.membership.confirmAmountEdit}
        onConfirm={openCheckout}
        onCancel={() => setConfirmingAmount(false)}
      />

      <ConfirmSheet
        visible={confirmingCancel}
        tone="danger"
        icon="warning"
        title={t.membership.cancelDowngrade}
        message={`${t.membership.cancelConfirmPrefix} ${t.subscription.donor} ${t.membership.cancelConfirmMiddle} ${renewsOn}${t.membership.cancelConfirmSuffix}`}
        confirmLabel={t.membership.confirmCancel}
        cancelLabel={t.membership.keepPlan}
        onConfirm={handleCancelDowngrade}
        onCancel={() => setConfirmingCancel(false)}
      />
    </View>
  );
}
