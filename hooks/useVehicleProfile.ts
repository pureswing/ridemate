import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { VehicleProfile, VehicleAmenity, AmenityDetails } from '@/types';

export function useVehicleProfile() {
  const [loading, setLoading] = useState(false);

  async function getMyVehicle(userId: string): Promise<VehicleProfile | null> {
    const { data, error } = await supabase
      .from('vehicle_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data as VehicleProfile | null;
  }

  async function upsertVehicle(
    userId: string,
    vehicle: {
      vin?: string;
      make: string;
      model: string;
      trim?: string;
      year: number;
      color: string;
      fuel_type?: string;
      seats?: number;
      photo_url?: string;
      amenities: VehicleAmenity[];
      amenity_details?: AmenityDetails;
      insurance_self_certified: boolean;
    }
  ): Promise<VehicleProfile> {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicle_profiles')
        .upsert({ user_id: userId, ...vehicle }, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;
      return data as VehicleProfile;
    } finally {
      setLoading(false);
    }
  }

  async function uploadVehiclePhoto(userId: string, uri: string): Promise<string> {
    const fileName = `${userId}/vehicle.jpg`;
    // React Native's Blob serialization is unreliable for storage uploads;
    // ArrayBuffer is what Supabase Storage actually expects from RN clients.
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const { error } = await supabase.storage
      .from('vehicle-photos')
      .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('vehicle-photos').getPublicUrl(fileName);
    // Cache-bust so the CDN serves the new file after an upsert replace
    return `${data.publicUrl}?t=${Date.now()}`;
  }

  return { getMyVehicle, upsertVehicle, uploadVehiclePhoto, loading };
}
