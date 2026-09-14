import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@botego_seen_posts';

// Powers the feed's "NEW"/"EDITED" badge (components/ride/RideCard.tsx +
// RideCardGrid.tsx, see utils/postFreshness.ts) — per-viewer, on-device only
// (no backend concept of "has this user seen this post"). Maps postId to the
// ISO timestamp of whichever version (created_at, or edited_at if edited)
// was on screen the last time this viewer opened it, so a post that's
// edited again AFTER being seen shows "EDITED" again rather than staying
// dismissed forever.
interface SeenPostsState {
  seen: Record<string, string>;
  loaded: boolean;
  load: () => Promise<void>;
  markSeen: (postId: string, versionAt: string) => Promise<void>;
}

export const useSeenPostsStore = create<SeenPostsState>((set, get) => ({
  seen: {},
  loaded: false,
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      set({ seen: raw ? JSON.parse(raw) : {}, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  markSeen: async (postId, versionAt) => {
    const next = { ...get().seen, [postId]: versionAt };
    set({ seen: next });
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  },
}));
