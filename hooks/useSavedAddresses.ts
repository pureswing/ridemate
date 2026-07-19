import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { SavedAddress } from '@/types';

// Address Book persistence — one row per (user, slot_id). Replaces the
// session-local state every post form and the profile Address Book screen
// used to keep independently (never written to the DB). See
// supabase/migrations/018_saved_addresses.sql.
export function useSavedAddresses() {
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const getSavedAddresses = useCallback(async (): Promise<SavedAddress[]> => {
    if (!session?.user) return [];
    const { data, error } = await supabase
      .from('saved_addresses')
      .select('*')
      .eq('user_id', session.user.id);
    if (error) throw error;
    return (data as SavedAddress[]) ?? [];
  }, [session]);

  const saveAddress = useCallback(async (slotId: string, value: string, icon?: string): Promise<SavedAddress> => {
    if (!session?.user) throw new Error('Not authenticated');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_addresses')
        .upsert(
          { user_id: session.user.id, slot_id: slotId, value, ...(icon ? { icon } : {}) },
          { onConflict: 'user_id,slot_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data as SavedAddress;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const deleteAddress = useCallback(async (slotId: string): Promise<void> => {
    if (!session?.user) return;
    const { error } = await supabase
      .from('saved_addresses')
      .delete()
      .eq('user_id', session.user.id)
      .eq('slot_id', slotId);
    if (error) throw error;
  }, [session]);

  return { getSavedAddresses, saveAddress, deleteAddress, loading };
}
