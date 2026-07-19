import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// expo-secure-store is backed by the Android Keystore / iOS Keychain, both of
// which cap a single value around 2048 bytes — Supabase's persisted session
// (access token + refresh token + user metadata) regularly exceeds that. This
// wrapper transparently splits an oversized value across multiple keys on
// write and reassembles it on read, instead of silently failing to persist
// (or throwing, in a future SDK version) past the limit.
const CHUNK_SIZE = 1800;

async function removeChunked(key: string): Promise<void> {
  const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
  if (chunkCountStr != null) {
    const chunkCount = parseInt(chunkCountStr, 10);
    await Promise.all(
      Array.from({ length: chunkCount }, (_, i) => SecureStore.deleteItemAsync(`${key}_${i}`))
    );
    await SecureStore.deleteItemAsync(`${key}_chunks`);
  }
  await SecureStore.deleteItemAsync(key);
}

const ExpoSecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
    if (chunkCountStr == null) return SecureStore.getItemAsync(key);

    const chunkCount = parseInt(chunkCountStr, 10);
    const parts: string[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const part = await SecureStore.getItemAsync(`${key}_${i}`);
      if (part == null) return null; // corrupted/partial write — treat as missing
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    // Clears any previous chunked (or plain) value under this key first, so
    // shrinking below the chunk threshold doesn't leave stale chunk keys behind.
    await removeChunked(key);
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(`${key}_chunks`, String(chunkCount));
    await Promise.all(
      Array.from({ length: chunkCount }, (_, i) =>
        SecureStore.setItemAsync(`${key}_${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))
      )
    );
  },
  removeItem: (key: string) => removeChunked(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
