import { useLanguageStore } from '@/store/languageStore';
import translations from '@/constants/i18n';

export function useTranslation() {
  const language = useLanguageStore((s) => s.language);
  return translations[language];
}
