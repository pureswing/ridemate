import { create } from 'zustand';

export type ToastPostKind = 'ride' | 'package' | 'hauling';

export interface PostToast {
  id: string; // ride_posts.id — also used as the toast's own key
  kind: ToastPostKind;
}

interface PostToastState {
  queue: PostToast[];
  pushToast: (toast: PostToast) => void;
  dismissToast: (id: string) => void;
}

// One toast on screen at a time — PostToastHost pops the front of the queue,
// shows it briefly, then moves to the next. A plain array is enough; this
// never needs to survive app restarts.
export const usePostToastStore = create<PostToastState>((set) => ({
  queue: [],
  pushToast: (toast) => set((s) => (s.queue.some((t) => t.id === toast.id) ? s : { queue: [...s.queue, toast] })),
  dismissToast: (id) => set((s) => ({ queue: s.queue.filter((t) => t.id !== id) })),
}));
