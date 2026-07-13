import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { Profile, Subscription } from '@/types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  subscription: Subscription | null;
  loading: boolean;
  // A recovery-link session (ridemate://reset-password) is a real Supabase session,
  // but it must NOT be treated as "logged in" — it exists only so the user can set a
  // new password. This flag stops the (auth) layout from redirecting it to (tabs).
  isPasswordRecovery: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSubscription: (subscription: Subscription | null) => void;
  setLoading: (loading: boolean) => void;
  setIsPasswordRecovery: (value: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  subscription: null,
  loading: true,
  isPasswordRecovery: false,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setSubscription: (subscription) => set({ subscription }),
  setLoading: (loading) => set({ loading }),
  setIsPasswordRecovery: (isPasswordRecovery) => set({ isPasswordRecovery }),
  clear: () => set({ session: null, profile: null, subscription: null, loading: false, isPasswordRecovery: false }),
}));
