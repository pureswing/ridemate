import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language } from '@/constants/i18n';

const STORAGE_KEY = '@ridemate_language';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  loadLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en',
  setLanguage: async (lang) => {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    set({ language: lang });
  },
  loadLanguage: async () => {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es') {
      set({ language: saved });
    }
  },
}));
