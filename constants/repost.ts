// Grace window an expired post stays re-postable before the
// expire-unconfirmed-posts cron deletes it. Mirrors FREE_WINDOW /
// DONOR_WINDOW in supabase/functions/expire-unconfirmed-posts/index.ts —
// the server is the source of truth; this only drives the countdown shown on
// the Re-post screen.
export const REPOST_WINDOW_HOURS = { free: 72, donor: 30 * 24 } as const;

// Remaining time before an expired post is deleted, or 0 once past it.
export function repostMsLeft(expiredAt: string | null | undefined, isDonor: boolean, now = Date.now()): number {
  if (!expiredAt) return 0;
  const hours = isDonor ? REPOST_WINDOW_HOURS.donor : REPOST_WINDOW_HOURS.free;
  return Math.max(0, new Date(expiredAt).getTime() + hours * 3_600_000 - now);
}
