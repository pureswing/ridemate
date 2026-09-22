import { useState } from 'react';
import { View, ScrollView, Linking } from 'react-native';
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
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { MembershipCheckoutSheet } from '@/components/profile/MembershipCheckoutSheet';
import { useAuthStore } from '@/store/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { usePurchases } from '@/hooks/usePurchases';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { fonts, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { TIER_ICON, PLAN_FEATURES, DONOR_AMOUNTS, DONOR_SUGGESTED_AMOUNT } from '@/constants/membershipPlans';

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
  const { profile, subscription } = useAuthStore();
  const { tier, isFree, daysRemaining } = useSubscription();
  const { offering, purchase, purchasing } = usePurchases();

  const [selectedAmount, setSelectedAmount] = useState<(typeof DONOR_AMOUNTS)[number]>(DONOR_SUGGESTED_AMOUNT);
  // Paid users don't see the amount picker by default (they see BadgeExplainer
  // instead) — only after tapping "Change monthly amount" on CurrentPlanCard.
  // Free users always see it; see `pickerVisible` below.
  const [adjustingAmount, setAdjustingAmount] = useState(false);
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

  function openCheckout() {
    setCheckout(isFree ? 'new' : 'adjust');
  }

  function handleChangeAmountPress() {
    setSelectedAmount(currentAmount as (typeof DONOR_AMOUNTS)[number]);
    setAdjustingAmount(true);
  }

  // MembershipCheckoutSheet already ran the real purchase (native Google
  // Play Billing sheet) before calling this — store/authStore.ts's
  // `subscription` is already up to date via usePurchases' own sync, this
  // just closes the sheet and collapses the picker back down.
  function handleConfirm() {
    setCheckout(null);
    setAdjustingAmount(false);
  }

  // RevenueCat/store subscriptions can't be cancelled via API call — only
  // through the platform's own subscription-management screen. This just
  // routes there; store/authStore.ts's `subscription` updates on its own
  // once the cancellation takes effect (useRevenueCatSync's listener).
  function handleCancelDowngrade() {
    setConfirmingCancel(false);
    Linking.openURL('https://play.google.com/store/account/subscriptions');
  }

  // Only worth showing where free and paid actually diverge — rows where
  // both tiers get the identical thing (e.g. posting/browsing, messaging)
  // are true but not a "comparison", so they're filtered out here rather
  // than padding the table with two matching checkmarks. hasText rows
  // (e.g. saved addresses: "1" vs "Up to 5") always count as differing,
  // since the boolean free/paid fields on those rows are both true.
  const DIFFERING_FEATURES = PLAN_FEATURES.filter((row) => row.hasText || row.free !== row.paid);

  const FEATURE_LABELS: Record<string, string> = {
    postBrowse: t.membership.featurePostBrowse,
    messaging: t.membership.featureMessaging,
    savedAddresses: t.membership.featureSavedAddresses,
    earlyAccess: t.membership.featureEarlyAccess,
    routeIntel: t.membership.featureRouteIntel,
    communityFeedback: t.membership.featureCommunityFeedback,
    dashboardInsights: t.membership.featureDashboardInsights,
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
        // zIndex so scrolled content sliding up behind this header (see the
        // ScrollView's negative marginTop below) is actually painted
        // underneath it, not on top — sibling order alone isn't enough once
        // both are stacking. Matches every other screen's gradient header.
        style={{ paddingTop: insets.top + 8, paddingBottom: 24, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg, zIndex: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {t.membership.eyebrow}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ alignItems: 'center', marginTop: 14 }}>
          {/* Same background + border as the "membership" card on the
              profile tab (app/(tabs)/profile.tsx: backgroundColor="#1C1410",
              borderColor={theme.borderGold}) — icon color matches that
              card's "MEMBERSHIP" label (categoryLabelStyle + theme.gold300). */}
          <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: '#1C1410', borderWidth: 1, borderColor: theme.borderGold, alignItems: 'center', justifyContent: 'center', ...shadows.gold }}>
            <Icon name={TIER_ICON[tier]} size={28} color={tier === 'donor' ? theme.gold300 : '#FFFFFF'} />
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
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, gap: 20, paddingBottom: insets.bottom + 40 }}>
        {!isFree && (
          <Card padding={16} radius={18} elevation="lg">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#1C1410', borderWidth: 1, borderColor: theme.borderGold, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={TIER_ICON.donor} size={19} color={theme.gold300} />
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
            {DIFFERING_FEATURES.map((row, i) => (
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
                {i < DIFFERING_FEATURES.length - 1 && <RowDivider theme={theme} />}
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
            <Button variant="primary" size="lg" fullWidth onPress={openCheckout}>
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
        ) : null}
        </ScrollView>
      </View>

      <MembershipCheckoutSheet
        visible={checkout != null}
        amount={selectedAmount}
        mode={checkout ?? 'new'}
        offering={offering}
        purchase={purchase}
        purchasing={purchasing}
        onClose={() => setCheckout(null)}
        onConfirm={handleConfirm}
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
