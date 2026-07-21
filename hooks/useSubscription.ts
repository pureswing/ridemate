import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import { MembershipTier } from '@/types';

export function useSubscription() {
  const { subscription } = useAuthStore();
  const t = useTranslation();

  const isActive = subscription?.status === 'active';
  const isFree = !subscription || subscription.status === 'free';
  // Donor is the only paid plan — kept as its own flag since call sites that
  // specifically mean "is a donor" read better than a bare `!isFree`.
  const isDonor = !isFree;
  const tier: MembershipTier = isFree ? 'free' : 'donor';
  const planLabel = isFree ? t.subscription.free : t.subscription.donor;

  const daysRemaining = subscription?.period_end
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.period_end).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return { subscription, isActive, isFree, isDonor, tier, planLabel, daysRemaining };
}
