import { create } from 'zustand';

interface MessagesBadgeState {
  hasUnread: boolean;
  // null = "never visited the Messages tab this session" — the poll then
  // flags ANY unread message regardless of age. Once set, only messages
  // newer than this count, so re-polling right after a visit doesn't
  // immediately re-flag the same still-unread (but already-seen) messages —
  // this is a "seen the inbox" marker, independent of each message's own
  // read_at (which only flips true once its specific conversation is opened).
  seenUpTo: Date | null;
  setHasUnread: (value: boolean) => void;
  markSeen: () => void;
}

export const useMessagesBadgeStore = create<MessagesBadgeState>((set) => ({
  hasUnread: false,
  seenUpTo: null,
  setHasUnread: (hasUnread) => set({ hasUnread }),
  markSeen: () => set({ hasUnread: false, seenUpTo: new Date() }),
}));
