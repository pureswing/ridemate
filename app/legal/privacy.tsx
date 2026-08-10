import { LegalDocument } from '@/components/legal/LegalDocument';
import { useTranslation } from '@/hooks/useTranslation';

export default function PrivacyScreen() {
  const t = useTranslation();
  return (
    <LegalDocument
      icon="lock"
      title={t.legal.privacy.title}
      lastUpdated={t.legal.lastUpdated}
      intro={t.legal.privacy.intro}
      sections={t.legal.privacy.sections}
    />
  );
}
