import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { UserFavorite } from '@/types';

export function useFavorites() {
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const getFavorites = useCallback(async (): Promise<UserFavorite[]> => {
    if (!session?.user) return [];
    const { data, error } = await supabase
      .from('user_favorites')
      .select('*, driver:profiles!driver_id(full_name, avatar_url)')
      .eq('rider_id', session.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as UserFavorite[]) ?? [];
  }, [session]);

  const isFavorited = useCallback(async (driverId: string): Promise<boolean> => {
    if (!session?.user) return false;
    const { data } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('rider_id', session.user.id)
      .eq('driver_id', driverId)
      .maybeSingle();
    return !!data;
  }, [session]);

  const countFavoritesInCity = useCallback(async (city: string): Promise<number> => {
    if (!session?.user) return 0;
    const { count } = await supabase
      .from('user_favorites')
      .select('id', { count: 'exact', head: true })
      .eq('rider_id', session.user.id)
      .eq('city', city);
    return count ?? 0;
  }, [session]);

  const saveFavorite = useCallback(async (driverId: string, city: string): Promise<void> => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_favorites')
        .insert({ rider_id: session.user.id, driver_id: driverId, city });
      if (error) {
        if (error.message.includes('favorites_limit_reached')) {
          throw new Error('LIMIT_REACHED');
        }
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }, [session]);

  const removeFavorite = useCallback(async (driverId: string): Promise<void> => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('rider_id', session.user.id)
        .eq('driver_id', driverId);
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, [session]);

  return { getFavorites, isFavorited, countFavoritesInCity, saveFavorite, removeFavorite, loading };
}
