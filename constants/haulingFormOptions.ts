import { IconName } from '@/constants/icons';

// English-only enumerated chip lists for the hauling post form — same
// precedent as rideFormOptions.ts. Shared between app/post/hauling.tsx
// (create) and app/hauling/edit/[id].tsx (edit).
// Ported 1:1 from ui_kits/ridemate-app/PostHauling.jsx (HL_TYPES, HL_SIZES,
// HL_ACCESS, PROHIBITED).
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
