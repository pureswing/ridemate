import { IconName } from '@/constants/icons';

// Enumerated chip lists for the package/courier post form. Shared between
// app/post/package.tsx (create) and app/package/edit/[id].tsx (edit). Values
// stay these exact English strings (the real stored/matched contentTags and
// prohibited-item confirmations) but the rendered text is translated via
// translatePackageLabel()/translatePackageSub() below (2026-09-21).
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

// Spanish display text for this file's catalogs — same pattern as
// rideFormOptions.ts's translatePrefLabel: the English label/sub stay the
// real stored/matched values (contentTags, prohibited-item confirmations),
// only the rendered text changes with locale.
const PACKAGE_LABELS_ES: Record<string, string> = {
  'Envelope': 'Sobre',
  'Small box': 'Caja pequeña',
  'Large box': 'Caja grande',
  'Oversized': 'Sobredimensionado',
  'Clothing': 'Ropa',
  'Documents': 'Documentos',
  'Auto parts': 'Partes de auto',
  'Electronics': 'Electrónicos',
  'Food': 'Comida',
  'Books': 'Libros',
  'Personal items': 'Artículos personales',
  'Medicine': 'Medicinas',
  'Tools': 'Herramientas',
  'Other': 'Otro',
  'Fragile': 'Frágil',
  'Keep upright': 'Mantener en posición vertical',
  'Temp sensitive': 'Sensible a la temperatura',
  'Keep dry / No water': 'Mantener seco / Sin agua',
  'Signature required': 'Requiere firma',
  'Cash or money orders': 'Efectivo o giros postales',
  'Jewelry, watches or valuables': 'Joyas, relojes u objetos de valor',
  'Firearms or weapons of any kind': 'Armas de fuego o de cualquier tipo',
  'Narcotics or illegal substances': 'Narcóticos o sustancias ilegales',
};

const PACKAGE_SUB_LABELS_ES: Record<string, string> = {
  '< 1 lb': '< 1 lb',
  '1–10 lbs': '1–10 lbs',
  '10–50 lbs': '10–50 lbs',
  '50+ lbs': '50+ lbs',
  'Handle with extra care': 'Manejar con cuidado extra',
  'Do not lay flat or tip': 'No acostar ni inclinar',
  'Avoid heat or freezing': 'Evitar calor o congelamiento',
  'Protect from rain or spills': 'Proteger de lluvia o derrames',
  'Recipient must sign on delivery': 'El destinatario debe firmar al recibir',
  'Including gift cards over $100': 'Incluye tarjetas de regalo de más de $100',
  'Including parts and ammunition': 'Incluye partes y municiones',
  'Federal and state law apply': 'Aplican leyes federales y estatales',
};

export function translatePackageLabel(label: string, locale: string): string {
  if (!locale.startsWith('es')) return label;
  return PACKAGE_LABELS_ES[label] ?? label;
}

export function translatePackageSub(sub: string | undefined, locale: string): string | undefined {
  if (sub == null || !locale.startsWith('es')) return sub;
  return PACKAGE_SUB_LABELS_ES[sub] ?? sub;
}
