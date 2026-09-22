import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { Profile, Subscription } from '@/types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  subscription: Subscription | null;
  loading: boolean;
  // A recovery-link session (botego://reset-password) is a real Supabase session,
  // but it must NOT be treated as "logged in" — it exists only so the user can set a
  // new password. This flag stops the (auth) layout from redirecting it to (tabs).
  isPasswordRecovery: boolean;
  // supabase/migrations/065_single_session.sql — this device's claimed
  // active_session_id, set once per app session (fresh login, or the first
  // loadProfile() after restoring an existing one). See
  // hooks/useSessionGuard.ts, which signs this device out the moment
  // another device's login overwrites the server's copy of this value.
  mySessionId: string | null;
  // True right after useSessionGuard force-signs this device out — the
  // (auth) welcome screen reads and clears this to show a one-time notice.
  loggedOutElsewhere: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSubscription: (subscription: Subscription | null) => void;
  setLoading: (loading: boolean) => void;
  setIsPasswordRecovery: (value: boolean) => void;
  setMySessionId: (id: string | null) => void;
  setLoggedOutElsewhere: (value: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  subscription: null,
  loading: true,
  isPasswordRecovery: false,
  mySessionId: null,
  loggedOutElsewhere: false,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setSubscription: (subscription) => set({ subscription }),
  setLoading: (loading) => set({ loading }),
  setIsPasswordRecovery: (isPasswordRecovery) => set({ isPasswordRecovery }),
  setMySessionId: (mySessionId) => set({ mySessionId }),
  setLoggedOutElsewhere: (loggedOutElsewhere) => set({ loggedOutElsewhere }),
  clear: () => set({ session: null, profile: null, subscription: null, loading: false, isPasswordRecovery: false, mySessionId: null }),
}));
