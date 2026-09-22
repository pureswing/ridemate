import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { useAuthStore } from '@/store/authStore';
import { DONOR_AMOUNTS, DONOR_PACKAGE_ID } from '@/constants/membershipPlans';

// The entitlement identifier set up in the RevenueCat dashboard — see
// constants/membershipPlans.ts's DONOR_PACKAGE_ID for the 3 products
// ($10/$20/$50 monthly) that grant it.
const DONOR_ENTITLEMENT = 'donor';

let configured = false;

function configureOnce() {
  if (configured) return;
  const apiKey = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
    : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
  if (!apiKey || apiKey.includes('...')) {
    console.warn(`[usePurchases] RevenueCat API key not configured for ${Platform.OS} — see .env`);
    return;
  }
  Purchases.configure({ apiKey });
  configured = true;
}

// Reverses DONOR_PACKAGE_ID — a purchased/active product id maps back to the
// dollar amount it represents, since RevenueCat's CustomerInfo only ever
// gives us the product id, never the amount directly.
const AMOUNT_BY_PRODUCT_ID: Record<string, number> = Object.fromEntries(
  DONOR_AMOUNTS.map((amt) => [DONOR_PACKAGE_ID[amt], amt])
);

// Translates RevenueCat's CustomerInfo into this app's own Subscription
// shape (store/authStore.ts) — every other screen already reads tier/
// isDonor/period_end off that shape (see hooks/useSubscription.ts), so this
// is the one place real entitlement data has to get funneled into it.
//
// Donor status can come from two independent sources that both write the
// same Subscription shape: a real RevenueCat purchase (this function), or
// an admin's manual override / an accepted email invite (Supabase, written
// server-side — see supabase/functions/admin-set-subscription and
// 063_admin_invites.sql). This function must never clobber the latter: it
// marks every row IT writes with id: 'revenuecat', and when RevenueCat has
// no active entitlement, it only downgrades to free if the CURRENT
// subscription was itself RevenueCat-sourced (id === 'revenuecat') — an
// admin/invite-granted row (a real Supabase id) is left alone.
function syncSubscriptionFromCustomerInfo(userId: string, info: CustomerInfo) {
  const entitlement = info.entitlements.active[DONOR_ENTITLEMENT];
  const { subscription, setSubscription } = useAuthStore.getState();
  if (entitlement) {
    const amount = AMOUNT_BY_PRODUCT_ID[entitlement.productIdentifier];
    // Guards against a render-loop: react-native-purchases' Test Store
    // integration re-emits CustomerInfoUpdateListener repeatedly on this SDK
    // version whenever it hits an unrelated internal deserialization error
    // (see the "Error deserializing subscription information... test_store"
    // log — cosmetic, doesn't affect the real entitlement data, but without
    // this check every re-emission would call setSubscription with
    // effectively-identical data, re-rendering the whole app in a tight
    // loop). Skip the write entirely when nothing meaningful changed.
    if (subscription?.id === 'revenuecat' && subscription.status === 'active'
      && subscription.amount_donated === amount && subscription.period_end === (entitlement.expirationDate ?? undefined)) {
      return;
    }
    setSubscription({
      id: 'revenuecat',
      user_id: userId,
      status: 'active',
      plan: 'donor',
      amount_donated: amount,
      period_start: entitlement.originalPurchaseDate,
      period_end: entitlement.expirationDate ?? undefined,
      created_at: subscription?.id === 'revenuecat' ? (subscription.created_at ?? entitlement.originalPurchaseDate) : entitlement.originalPurchaseDate,
    });
  } else if (subscription?.id === 'revenuecat') {
    // Only reachable once this account's active status was itself set by
    // RevenueCat (a prior purchase that has since expired/cancelled) —
    // never for an admin/invite-granted row, which has a real Supabase id.
    if (subscription.status === 'free') return; // same loop guard as above
    setSubscription({
      id: 'revenuecat',
      user_id: userId,
      status: 'free',
      created_at: subscription.created_at ?? new Date().toISOString(),
    });
  }
}

// Call once, app-wide (app/_layout.tsx) — configures the SDK, identifies
// the logged-in user to RevenueCat, and keeps store/authStore.ts's
// `subscription` in sync with the real entitlement (both on load and
// whenever it changes, e.g. a renewal or a cancellation from Play Store
// itself, not just purchases made inside this app).
export function useRevenueCatSync(userId: string | undefined) {
  useEffect(() => {
    configureOnce();
  }, []);

  useEffect(() => {
    if (!userId || !configured) return;
    let cancelled = false;

    Purchases.logIn(userId)
      .then(({ customerInfo }) => { if (!cancelled) syncSubscriptionFromCustomerInfo(userId, customerInfo); })
      .catch((e) => console.warn('[useRevenueCatSync] logIn failed', e));

    const listener = (info: CustomerInfo) => syncSubscriptionFromCustomerInfo(userId, info);
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [userId]);
}

// Call from the Membership screen — fetches the current Offering (the 3
// donor_monthly_* packages) on demand and exposes the purchase action.
export function usePurchases() {
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!configured) return;
    Purchases.getOfferings()
      .then((res) => setOffering(res.current))
      .catch((e) => setOfferingsError(e?.message ?? String(e)));
  }, []);

  // amount must be one of DONOR_AMOUNTS — resolves it to the matching
  // package via DONOR_PACKAGE_ID and triggers the native Google Play
  // Billing purchase sheet. Throws on failure; a user-initiated cancel
  // throws with userCancelled: true on the error object (react-native-
  // purchases' convention) — callers should check that before showing an
  // error message.
  async function purchase(amount: (typeof DONOR_AMOUNTS)[number]) {
    if (!offering) throw new Error('Offerings not loaded yet');
    const productId = DONOR_PACKAGE_ID[amount];
    const pkg = offering.availablePackages.find((p) => p.product.identifier === productId);
    if (!pkg) throw new Error(`No RevenueCat package found for product "${productId}" in the current offering`);
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const userId = useAuthStore.getState().session?.user?.id;
      if (userId) syncSubscriptionFromCustomerInfo(userId, customerInfo);
      return customerInfo;
    } finally {
      setPurchasing(false);
    }
  }

  return { offering, offeringsError, purchasing, purchase };
}
