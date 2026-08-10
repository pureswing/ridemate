import { LegalDocument } from '@/components/legal/LegalDocument';
import { useTranslation } from '@/hooks/useTranslation';

export default function TermsScreen() {
  const t = useTranslation();
  return (
    <LegalDocument
      icon="scale"
      title={t.legal.terms.title}
      lastUpdated={t.legal.lastUpdated}
      intro={t.legal.terms.intro}
      sections={t.legal.terms.sections}
    />
  );
}
