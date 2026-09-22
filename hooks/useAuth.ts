import { useState } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useMessagesBadgeStore } from '@/store/messagesBadgeStore';
import { AccessibilityNeed } from '@/types';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const { setProfile, setSubscription, clear, setMySessionId } = useAuthStore();

  async function uploadAvatar(userId: string, uri: string): Promise<string> {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const fileName = `${userId}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return `${data.publicUrl}?t=${Date.now()}`;
  }

  async function updateProfile(userId: string, data: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
    home_city?: string;
    bio?: string;
    accessibility_needs?: AccessibilityNeed[];
    accessibility_note?: string;
    notif_master?: boolean;
    notif_rides?: boolean;
    notif_packages?: boolean;
    notif_hauling?: boolean;
    notif_post_messages?: boolean;
    notif_reminders?: boolean;
    trusted_drivers_first?: boolean;
  }) {
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    setProfile(updated);
    return updated;
  }

  async function signIn(email: string, password: string) {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Single-session enforcement (see supabase/migrations/065_single_session.sql
      // and hooks/useSessionGuard.ts): claim a fresh session id for this device,
      // then revoke every other device's refresh token. A device with the app
      // open right now finds out via useSessionGuard's Realtime subscription,
      // not just whenever its token next fails to refresh.
      const { data: claimedSessionId } = await supabase.rpc('claim_session');
      if (claimedSessionId) {
        setMySessionId(claimedSessionId);
        await supabase.auth.signOut({ scope: 'others' });
      }
    } finally {
      setLoading(false);
    }
  }

  // Returns true if Supabase requires email confirmation before a session exists
  // (project setting) — the caller shows the "check your email" step in that case.
  async function signUp(email: string, password: string, fullName: string): Promise<{ needsVerification: boolean }> {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // Linking.createURL resolves to botego://verify in a real build, but to
        // exp://<dev-host>:<port>/--/verify in Expo Go — hardcoding the custom scheme
        // would silently break email links while testing in Expo Go.
        options: { data: { full_name: fullName }, emailRedirectTo: Linking.createURL('verify') },
      });
      if (error) throw error;
      return { needsVerification: !data.session };
    } finally {
      setLoading(false);
    }
  }

  // legal_name lives in profile_private, never in profiles — see migration 006_legal_name.sql.
  async function upsertLegalName(userId: string, legalName: string) {
    const { error } = await supabase
      .from('profile_private')
      .upsert({ id: userId, legal_name: legalName, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  async function getLegalName(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('profile_private')
      .select('legal_name')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data?.legal_name ?? null;
  }

  async function resetPasswordForEmail(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL('reset-password'),
    });
    if (error) throw error;
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async function loadProfile(userId: string) {
    const [profileRes, subRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('subscriptions').select('*').eq('user_id', userId).single(),
    ]);
    if (profileRes.data) {
      setProfile(profileRes.data);
      // First loadProfile() after restoring an existing session (app cold
      // start, not a fresh signIn() — that already set this via
      // claim_session()) — adopt the server's current value as ours. Only
      // ever set once per app session: a later loadProfile() (e.g. after
      // editing the profile) must NOT overwrite this with whatever another
      // device has since claimed, or useSessionGuard could never detect it.
      if (!useAuthStore.getState().mySessionId) {
        setMySessionId(profileRes.data.active_session_id ?? null);
      }
    }
    if (subRes.data) setSubscription(subRes.data);
  }

  async function signOut() {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      clear();
      // Otherwise a stale seenUpTo from this account could suppress a
      // genuinely new unread message's dot for whoever signs in next.
      useMessagesBadgeStore.setState({ hasUnread: false, seenUpTo: null });
    } finally {
      setLoading(false);
    }
  }

  return {
    signIn, signUp, signOut, loadProfile, uploadAvatar, updateProfile,
    upsertLegalName, getLegalName, resetPasswordForEmail, updatePassword,
    loading,
  };
}
