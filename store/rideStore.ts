import { create } from 'zustand';
import { RidePost, PostType, RidePostKind } from '@/types';

interface RideFilters {
  type: PostType | 'all';
  // Service (ride/package/hauling) — the header's quick chips and the
  // FilterDrawer's Service section both read/write this one field, so
  // picking a service in either place stays in sync with the other.
  kind: RidePostKind | 'all';
  originCity: string;
  destinationCity: string;
  date: string;
}

interface RideState {
  posts: RidePost[];
  filters: RideFilters;
  loading: boolean;
  setPosts: (posts: RidePost[]) => void;
  setFilters: (filters: Partial<RideFilters>) => void;
  setLoading: (loading: boolean) => void;
}

export const useRideStore = create<RideState>((set) => ({
  posts: [],
  filters: {
    type: 'all',
    kind: 'all',
    originCity: '',
    destinationCity: '',
    date: '',
  },
  loading: false,
  setPosts: (posts) => set({ posts }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  setLoading: (loading) => set({ loading }),
}));
