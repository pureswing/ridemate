import { IconName } from '@/constants/icons';
import { AccessibilityNeed } from '@/types';

export interface AccessibilityOptionDef {
  id: AccessibilityNeed;
  label: string;
  desc: string;
  icon: IconName;
}

// Self-described rider accessibility needs — RM_ACCESS_OPTIONS catalog, see
// supabase/migrations/008_accessibility_needs.sql. Ported 1:1 (icons, desc
// copy) from ui_kits/ridemate-app/data.js's window.RM_ACCESS_OPTIONS.
// Shared between the dedicated app/profile/accessibility.tsx screen, the
// profile edit screen's chip summary, and the ride post forms
// (app/post/ride.tsx, app/ride/edit/[id].tsx) — see those files' comments
// for how they're linked (default-inherit, one-way, no sync-back).
export const ACCESSIBILITY_OPTIONS: AccessibilityOptionDef[] = [
  { id: 'hard-of-hearing', label: 'Hard of hearing', desc: 'Face me when speaking and confirm pickup by text, not a call.', icon: 'ear' },
  { id: 'low-vision', label: 'Low vision', desc: 'Describe the vehicle and guide me verbally at pickup.', icon: 'glasses' },
  { id: 'limited-mobility', label: 'Limited mobility', desc: 'May need a hand getting in or out of the vehicle.', icon: 'hand' },
  { id: 'no-heavy-lift', label: "Can't lift heavy items", desc: 'Help loading bags or cargo is appreciated.', icon: 'weight' },
  { id: 'wheelchair', label: 'Uses a wheelchair', desc: 'Needs trunk space to stow a mobility device.', icon: 'accessible' },
  { id: 'prefers-text', label: 'Prefers text over calls', desc: 'Text instead of calling to coordinate.', icon: 'message_square_text' },
  { id: 'service-animal', label: 'Traveling with a service animal', desc: 'A service animal will accompany me.', icon: 'pets_ok' },
  { id: 'sensory', label: 'Sensory sensitivity', desc: 'Prefers a quiet, low-stimulation ride.', icon: 'volume_x' },
];

// Spanish display text, keyed by AccessibilityNeed id — the id is the real
// stored value everywhere (accessibility_needs column, details.accessibilityNeeds),
// only the rendered label/desc changes with locale. See rideFormOptions.ts's
// translatePrefLabel for the same pattern.
const ACCESSIBILITY_LABELS_ES: Record<AccessibilityNeed, { label: string; desc: string }> = {
  'hard-of-hearing': { label: 'Dificultad auditiva', desc: 'Mírame al hablar y confirma la recogida por mensaje de texto, no por llamada.' },
  'low-vision': { label: 'Baja visión', desc: 'Describe el vehículo y guíame verbalmente en la recogida.' },
  'limited-mobility': { label: 'Movilidad limitada', desc: 'Puede necesitar ayuda para subir o bajar del vehículo.' },
  'no-heavy-lift': { label: 'No puede levantar objetos pesados', desc: 'Se agradece ayuda para cargar bolsas o equipaje.' },
  'wheelchair': { label: 'Usa silla de ruedas', desc: 'Necesita espacio en el maletero para guardar un dispositivo de movilidad.' },
  'prefers-text': { label: 'Prefiere mensajes de texto', desc: 'Enviar mensaje en vez de llamar para coordinar.' },
  'service-animal': { label: 'Viaja con animal de servicio', desc: 'Un animal de servicio me acompañará.' },
  'sensory': { label: 'Sensibilidad sensorial', desc: 'Prefiere un viaje tranquilo, con poca estimulación.' },
};

export function translateAccessibilityOption(opt: AccessibilityOptionDef, locale: string): { label: string; desc: string } {
  if (!locale.startsWith('es')) return { label: opt.label, desc: opt.desc };
  return ACCESSIBILITY_LABELS_ES[opt.id] ?? { label: opt.label, desc: opt.desc };
}
