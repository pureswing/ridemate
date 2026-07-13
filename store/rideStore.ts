import { create } from 'zustand';
import { RidePost, PostType } from '@/types';

interface RideFilters {
  type: PostType | 'all';
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
