import { IconName } from '@/constants/icons';

// English-only enumerated chip lists for the package/courier post form —
// same precedent as rideFormOptions.ts (untranslated, matches the design's
// own hardcoded English labels rather than half-translating ~30 more strings).
// Shared between app/post/package.tsx (create) and app/package/edit/[id].tsx (edit).
// Ported 1:1 from ui_kits/ridemate-app/PostPackage.jsx (PKG_SIZES, CONTENT_TAGS,
// PKG_RULES, PROHIBITED_PKG).
export const PACKAGE_SIZES: { value: 'envelope' | 'small' | 'large' | 'oversized'; label: string; sub: string; icon: IconName }[] = [
  { value: 'envelope', label: 'Envelope', sub: '< 1 lb', icon: 'package' },
  { value: 'small', label: 'Small box', sub: '1–10 lbs', icon: 'package' },
  { value: 'large', label: 'Large box', sub: '10–50 lbs', icon: 'package' },
  { value: 'oversized', label: 'Oversized', sub: '50+ lbs', icon: 'truck' },
];

export const CONTENT_TAGS = [
  'Clothing', 'Documents', 'Auto parts', 'Electronics',
  'Food', 'Books', 'Personal items', 'Medicine',
  'Tools', 'Other',
];

export const HANDLING_OPTIONS: { label: string; icon: IconName; sub: string }[] = [
  { label: 'Fragile', icon: 'sparkles', sub: 'Handle with extra care' },
  { label: 'Keep upright', icon: 'arrow_up_down', sub: 'Do not lay flat or tip' },
  { label: 'Temp sensitive', icon: 'thermometer', sub: 'Avoid heat or freezing' },
  { label: 'Keep dry / No water', icon: 'water_drop', sub: 'Protect from rain or spills' },
  { label: 'Signature required', icon: 'edit', sub: 'Recipient must sign on delivery' },
];

// Self-certified, like VehicleProfile.insurance_self_certified — the app never
// inspects the package itself, only records the poster's own per-item
// confirmation (tracked by label, one entry per confirmed item).
export const PACKAGE_PROHIBITED_ITEMS: { label: string; sub?: string }[] = [
  { label: 'Cash or money orders', sub: 'Including gift cards over $100' },
  { label: 'Jewelry, watches or valuables' },
  { label: 'Firearms or weapons of any kind', sub: 'Including parts and ammunition' },
  { label: 'Narcotics or illegal substances', sub: 'Federal and state law apply' },
];
