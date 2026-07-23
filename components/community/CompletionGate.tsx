import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRideAgreements } from '@/hooks/useRideAgreements';
import { RideAgreement } from '@/types';
import { BadgeSelector } from './BadgeSelector';

// Mounted once at the app root (app/_layout.tsx) so it can surface as an
// overlay on top of whatever screen is showing, regardless of navigation
// state — "the first thing a user sees when opening the app" for any job
// left un-marked 2+ hours past its ETA. Stackable: if several jobs qualify,
// they're shown one at a time, each dismissable only by completing it
// (BadgeSelector itself blocks skip/backdrop dismissal).
export function CompletionGate() {
  const { session } = useAuthStore();
  const { getPendingCompletions, confirmCompletion } = useRideAgreements();
  const [queue, setQueue] = useState<RideAgreement[]>([]);

  useEffect(() => {
    if (!session?.user) {
      setQueue([]);
      return;
    }
    getPendingCompletions().then(setQueue).catch(() => {});
  }, [session?.user?.id]);

  const current = queue[0] ?? null;
  const myId = session?.user?.id;

  const handleBeforeSend = useCallback(async () => {
    if (!current || !myId) return;
    const isDriver = current.driver_id === myId;
    await confirmCompletion(current.id, isDriver ? 'driver' : 'rider');
  }, [current, myId, confirmCompletion]);

  if (!current || !myId) return null;

  const isDriver = current.driver_id === myId;
  const otherId = isDriver ? current.rider_id : current.driver_id;
  const otherName = isDriver ? current.rider?.full_name ?? '—' : current.driver?.full_name ?? '—';
  const otherAvatar = isDriver ? current.rider?.avatar_url : current.driver?.avatar_url;

  return (
    <BadgeSelector
      visible
      agreementId={current.id}
      receiverId={otherId}
      receiverName={otherName}
      receiverAvatar={otherAvatar}
      currentRole={isDriver ? 'driver' : 'rider'}
      kind={current.post?.kind ?? 'ride'}
      originCity={current.post?.origin_city ?? '—'}
      destinationCity={current.post?.destination_city ?? '—'}
      scheduledAt={current.post?.scheduled_at ?? ''}
      queueRemaining={queue.length - 1}
      onBeforeSend={handleBeforeSend}
      onDone={() => setQueue((prev) => prev.slice(1))}
    />
  );
}
