import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Conversation, Message } from '@/types';

export function useMessages() {
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Looks up an existing conversation for this post without creating one —
  // used to know whether the current user has already reached out (e.g. to
  // gate the "Interested" action on ride detail).
  const findConversation = useCallback(async (postId: string): Promise<Conversation | null> => {
    if (!session?.user) return null;
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('post_id', postId)
      .eq('requester_id', session.user.id)
      .maybeSingle();
    if (error) throw error;
    return (data as Conversation) ?? null;
  }, [session]);

  const getOrCreateConversation = useCallback(async (postId: string, postOwnerId: string): Promise<Conversation> => {
    if (!session?.user) throw new Error('Not authenticated');
    const existing = await findConversation(postId);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('conversations')
      .insert({ post_id: postId, post_owner_id: postOwnerId, requester_id: session.user.id })
      .select()
      .single();
    if (error) throw error;
    return data as Conversation;
  }, [session, findConversation]);

  const getConversations = useCallback(async (): Promise<Conversation[]> => {
    if (!session?.user) return [];
    const uid = session.user.id;
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        post:ride_posts(id, kind, type, origin_city, destination_city, scheduled_at),
        post_owner:profiles!post_owner_id(full_name, avatar_url),
        requester:profiles!requester_id(full_name, avatar_url)
      `)
      .or(`post_owner_id.eq.${uid},requester_id.eq.${uid}`)
      .order('last_message_at', { ascending: false });
    if (error) throw error;
    return (data as Conversation[]) ?? [];
  }, [session]);

  const getConversationById = useCallback(async (id: string): Promise<Conversation | null> => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        post:ride_posts(id, kind, type, origin_city, destination_city, scheduled_at),
        post_owner:profiles!post_owner_id(full_name, avatar_url),
        requester:profiles!requester_id(full_name, avatar_url)
      `)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as Conversation) ?? null;
  }, []);

  const getMessages = useCallback(async (conversationId: string): Promise<Message[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as Message[]) ?? [];
  }, []);

  const sendMessage = useCallback(async (conversationId: string, body: string, isSystem = false): Promise<Message> => {
    if (!session?.user) throw new Error('Not authenticated');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: session.user.id, body, is_system: isSystem })
        .select()
        .single();
      if (error) throw error;
      return data as Message;
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Most recent message in a conversation — used for the inbox row preview.
  const getLastMessage = useCallback(async (conversationId: string): Promise<Message | null> => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as Message) ?? null;
  }, []);

  // Count of the other party's messages I haven't read yet — `read_at` was
  // a dormant column (set nowhere in the app) until this + markConversationRead.
  const getUnreadCount = useCallback(async (conversationId: string): Promise<number> => {
    if (!session?.user) return 0;
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .is('read_at', null)
      .neq('sender_id', session.user.id);
    if (error) throw error;
    return count ?? 0;
  }, [session]);

  // Marks every unread message from the other party as read — call once a
  // thread is opened.
  const markConversationRead = useCallback(async (conversationId: string): Promise<void> => {
    if (!session?.user) return;
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .is('read_at', null)
      .neq('sender_id', session.user.id);
  }, [session]);

  // Post owner declining an unconfirmed conversation — deletes it outright
  // (messages cascade), see migration 020_conversation_decline.sql. The
  // requester can still message again afterward; that starts a brand-new
  // conversation row, not a reopened thread.
  const deleteConversation = useCallback(async (conversationId: string): Promise<void> => {
    const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
    if (error) throw error;
  }, []);

  return {
    findConversation, getOrCreateConversation, getConversations, getConversationById,
    getMessages, sendMessage, getLastMessage, getUnreadCount, markConversationRead,
    deleteConversation, loading,
  };
}
