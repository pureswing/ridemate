import { useState } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const { setProfile, setSubscription, clear } = useAuthStore();

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
        // Linking.createURL resolves to ridemate://verify in a real build, but to
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
    if (profileRes.data) setProfile(profileRes.data);
    if (subRes.data) setSubscription(subRes.data);
  }

  async function signOut() {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      clear();
    } finally {
      setLoading(false);
    }
  }

  return {
    signIn, signUp, signOut, loadProfile, uploadAvatar, updateProfile,
    upsertLegalName, resetPasswordForEmail, updatePassword,
    loading,
  };
}
