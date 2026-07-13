import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';

export function useSubscription() {
  const { subscription } = useAuthStore();
  const t = useTranslation();

  const isActive = subscription?.status === 'active';
  const isFree = !subscription || subscription.status === 'free';
  const planLabel =
    subscription?.plan === 'monthly'
      ? t.subscription.monthly
      : subscription?.plan === 'annual'
      ? t.subscription.annual
      : subscription?.plan === 'donation'
      ? t.subscription.donation
      : t.subscription.free;

  const daysRemaining = subscription?.period_end
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.period_end).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return { subscription, isActive, isFree, planLabel, daysRemaining };
}
