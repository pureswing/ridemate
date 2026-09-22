import { IconName } from '@/constants/icons';

// Enumerated chip lists for the hauling post form. Shared between
// app/post/hauling.tsx (create) and app/hauling/edit/[id].tsx (edit).
// Ported 1:1 from ui_kits/ridemate-app/PostHauling.jsx (HL_TYPES, HL_SIZES,
// HL_ACCESS, PROHIBITED). Values stay these exact English strings (the real
// stored/matched values) but the rendered text is translated via
// translateHaulingLabel()/translateHaulingSub() below (2026-09-21).
export const LOAD_TYPES: { label: string; icon: IconName; sub: string }[] = [
  { label: 'Construction debris', icon: 'brick_wall', sub: 'Drywall, wood, tile, concrete' },
  { label: 'Yard waste', icon: 'eco', sub: 'Branches, leaves, clippings' },
  { label: 'Furniture', icon: 'sofa', sub: 'Couches, tables, mattresses' },
  { label: 'Appliances', icon: 'washing_machine', sub: 'Fridges, washers, dryers' },
  { label: 'Electronics', icon: 'bolt', sub: 'TVs, computers, monitors' },
  { label: 'General junk', icon: 'delete', sub: 'Mixed household items' },
  { label: 'Mixed load', icon: 'layers', sub: 'A bit of everything' },
];

export const LOAD_SIZES: { value: 'suv' | 'half' | 'full' | 'multi'; label: string; sub: string }[] = [
  { value: 'suv', label: 'SUV load', sub: 'fits in a car trunk' },
  { value: 'half', label: 'Half truck', sub: '≈ 1–3 cubic yards' },
  { value: 'full', label: 'Full truck', sub: '≈ 4–6 cubic yards' },
  { value: 'multi', label: 'Multiple trips', sub: 'large volume' },
];

export const ACCESS_OPTIONS = ['Ground floor', 'Has stairs', 'Elevator', 'Outdoor only'];

// Self-certified, like PACKAGE_PROHIBITED_ITEMS — the app never inspects the
// load itself, only records the poster's own per-item confirmation (tracked
// by label, one entry per confirmed item).
export const HAULING_PROHIBITED_ITEMS: { label: string; sub?: string }[] = [
  { label: 'Chemical paints or solvents' },
  { label: 'Car or industrial batteries' },
  { label: 'Asbestos or asbestos-containing materials' },
  { label: 'Propane or gas tanks' },
  { label: 'Used or scrap tires', sub: 'Require special disposal permits in Miami-Dade, Hillsborough & other FL counties.' },
];

// Spanish display text for this file's catalogs — same pattern as
// rideFormOptions.ts's translatePrefLabel.
const HAULING_LABELS_ES: Record<string, string> = {
  'Construction debris': 'Escombros de construcción',
  'Yard waste': 'Desechos de jardín',
  'Furniture': 'Muebles',
  'Appliances': 'Electrodomésticos',
  'Electronics': 'Electrónicos',
  'General junk': 'Chatarra general',
  'Mixed load': 'Carga mixta',
  'SUV load': 'Carga tipo SUV',
  'Half truck': 'Medio camión',
  'Full truck': 'Camión completo',
  'Multiple trips': 'Varios viajes',
  'Ground floor': 'Planta baja',
  'Has stairs': 'Tiene escaleras',
  'Elevator': 'Ascensor',
  'Outdoor only': 'Solo exterior',
  'Chemical paints or solvents': 'Pinturas o solventes químicos',
  'Car or industrial batteries': 'Baterías de auto o industriales',
  'Asbestos or asbestos-containing materials': 'Asbesto o materiales que lo contengan',
  'Propane or gas tanks': 'Tanques de propano o gas',
  'Used or scrap tires': 'Llantas usadas o de desecho',
};

const HAULING_SUB_LABELS_ES: Record<string, string> = {
  'Drywall, wood, tile, concrete': 'Drywall, madera, azulejo, concreto',
  'Branches, leaves, clippings': 'Ramas, hojas, recortes',
  'Couches, tables, mattresses': 'Sofás, mesas, colchones',
  'Fridges, washers, dryers': 'Refrigeradores, lavadoras, secadoras',
  'TVs, computers, monitors': 'Televisores, computadoras, monitores',
  'Mixed household items': 'Artículos del hogar variados',
  'A bit of everything': 'Un poco de todo',
  'fits in a car trunk': 'cabe en el maletero de un auto',
  '≈ 1–3 cubic yards': '≈ 1–3 yardas cúbicas',
  '≈ 4–6 cubic yards': '≈ 4–6 yardas cúbicas',
  'large volume': 'gran volumen',
  'Require special disposal permits in Miami-Dade, Hillsborough & other FL counties.': 'Requieren permisos especiales de desecho en Miami-Dade, Hillsborough y otros condados de Florida.',
};

export function translateHaulingLabel(label: string, locale: string): string {
  if (!locale.startsWith('es')) return label;
  return HAULING_LABELS_ES[label] ?? label;
}

export function translateHaulingSub(sub: string | undefined, locale: string): string | undefined {
  if (sub == null || !locale.startsWith('es')) return sub;
  return HAULING_SUB_LABELS_ES[sub] ?? sub;
}
