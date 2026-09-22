// Enumerated chip lists for the ride post form (design system's PostRide.jsx).
// Shared between app/post/ride.tsx (create) and app/ride/edit/[id].tsx (edit).
// Every array's values stay these exact English strings — they're the real
// stored comfortPrefs/climatePrefs/.../rules values and the FilterDrawer's
// selection keys — but the rendered chip text is translated via
// translatePrefLabel() below (2026-09-21) for the current t.locale.
export const RULES = ['No smoking', 'No food', 'Pets OK', 'Music OK', 'A/C on', 'Quiet ride', 'Luggage OK'];
export const VEHICLE_TYPES = ['No preference', 'Sedan', 'Large Sedan', 'SUV', 'Large SUV', 'Minivan', 'Passenger Van', 'Luxury Sedan', 'Luxury SUV', 'Electric', 'Hybrid', 'Wheelchair-Accessible Vehicle'];
export const COMFORT_PREFS = ['No preference', 'Extra legroom', 'Front passenger seat', "Captain's chairs", 'Reclining seat', 'Easy-entry seat', 'Minimal climbing or bending', 'Leather interior', 'Executive-class interior', 'Rear passenger controls', 'Privacy partition'];
export const CLIMATE_PREFS = ['No preference', 'Cool vehicle before pickup', 'Warm vehicle before pickup', 'Strong air conditioning', 'Minimal air conditioning', 'Rear climate controls'];
export const SPECIFIC_TEMP = 'Specific temperature';
export const CHILD_SEAT_OPTIONS = ['No child seat needed', 'Rear-facing infant seat', 'Forward-facing child seat', 'High-back booster seat', 'Backless booster seat', 'Space for passenger-provided child seat', 'Multiple child seats', 'Seat provided by passenger or driver', 'Stroller storage', 'Family-friendly vehicle'];
// Ordered shortest-to-longest label so RuleChip's flexWrap row packs tighter
// with fewer trailing gaps — see OversizedSheet.tsx.
export const OVERSIZED_ITEMS = ['Walker', 'Stroller', 'Golf clubs', 'Medical equipment', 'Skis or snowboard', 'Musical instrument', 'Folding wheelchair', 'Large equipment case'];

// Added from a granular-preferences review (2026-07-18) — the subset judged
// compatible with BoteGo staying a classified-ads board (self-reported,
// informational, no matching/dispatch/verification implied). See
// project_legal_tnc_compliance memory before extending this list further.
export const ATMOSPHERE_PREFS = ['No preference', 'Conversation welcome', 'Minimal conversation', 'No phone calls from driver', 'No music', 'Soft music', 'Passenger controls music', 'Business-call friendly', 'Sleep-friendly ride'];
export const CLEANLINESS_PREFS = ['Standard clean vehicle', 'Fragrance-free', 'No air fresheners', 'Smoke-free', 'Vape-free', 'Pet-hair-free'];
export const PET_PREFS = ['No pet', 'Service animal', 'Small pet in carrier', 'Large pet in carrier', 'Small dog without carrier', 'Large dog without carrier', 'Multiple pets'];
export const PICKUP_PREFS = ['Standard curbside pickup', 'Driver calls on arrival', 'Driver sends text on arrival', 'Driver meets at the door', 'Driver meets in the lobby', 'Avoid honking', 'Text only, no calls', 'Extra pickup time needed'];
export const DRIVER_LANGUAGE_PREFS = ['No preference', 'English', 'Spanish', 'French', 'Portuguese', 'Other'];

// Spanish display text for every chip/toggle catalog in this file — see
// translatePrefLabel below. Keyed by the exact English value so the stored/
// filter-key string never changes with locale.
const PREF_LABELS_ES: Record<string, string> = {
  'No preference': 'Sin preferencia',
  'Extra legroom': 'Espacio extra para las piernas',
  'Front passenger seat': 'Asiento delantero',
  "Captain's chairs": 'Asientos capitán',
  'Reclining seat': 'Asiento reclinable',
  'Easy-entry seat': 'Asiento de fácil acceso',
  'Minimal climbing or bending': 'Mínimo esfuerzo para subir o agacharse',
  'Leather interior': 'Interior de piel',
  'Executive-class interior': 'Interior clase ejecutiva',
  'Rear passenger controls': 'Controles traseros para el pasajero',
  'Privacy partition': 'Mampara de privacidad',
  'Cool vehicle before pickup': 'Enfriar el vehículo antes de recoger',
  'Warm vehicle before pickup': 'Calentar el vehículo antes de recoger',
  'Strong air conditioning': 'Aire acondicionado fuerte',
  'Minimal air conditioning': 'Aire acondicionado mínimo',
  'Rear climate controls': 'Controles de clima traseros',
  'Specific temperature': 'Temperatura específica',
  'Standard clean vehicle': 'Vehículo limpio estándar',
  'Fragrance-free': 'Sin fragancias',
  'No air fresheners': 'Sin ambientadores',
  'Smoke-free': 'Libre de humo',
  'Vape-free': 'Libre de vapeo',
  'Pet-hair-free': 'Sin pelo de mascotas',
  // RULES
  'No smoking': 'No fumar',
  'No food': 'No comer',
  'Pets OK': 'Mascotas permitidas',
  'Music OK': 'Música permitida',
  'A/C on': 'Aire acondicionado encendido',
  'Quiet ride': 'Viaje silencioso',
  'Luggage OK': 'Equipaje permitido',
  // VEHICLE_TYPES
  'Sedan': 'Sedán',
  'Large Sedan': 'Sedán grande',
  'SUV': 'Camioneta SUV',
  'Large SUV': 'SUV grande',
  'Minivan': 'Minivan',
  'Passenger Van': 'Van de pasajeros',
  'Luxury Sedan': 'Sedán de lujo',
  'Luxury SUV': 'SUV de lujo',
  'Electric': 'Eléctrico',
  'Hybrid': 'Híbrido',
  'Wheelchair-Accessible Vehicle': 'Vehículo accesible en silla de ruedas',
  // CHILD_SEAT_OPTIONS
  'No child seat needed': 'No se necesita silla infantil',
  'Rear-facing infant seat': 'Silla para bebé orientada hacia atrás',
  'Forward-facing child seat': 'Silla infantil orientada hacia adelante',
  'High-back booster seat': 'Asiento elevador con respaldo alto',
  'Backless booster seat': 'Asiento elevador sin respaldo',
  'Space for passenger-provided child seat': 'Espacio para silla que traiga el pasajero',
  'Multiple child seats': 'Varias sillas infantiles',
  'Seat provided by passenger or driver': 'Silla provista por el pasajero o el conductor',
  'Stroller storage': 'Espacio para coche de bebé',
  'Family-friendly vehicle': 'Vehículo apto para familias',
  // OVERSIZED_ITEMS
  'Walker': 'Andador',
  'Stroller': 'Coche de bebé',
  'Golf clubs': 'Palos de golf',
  'Medical equipment': 'Equipo médico',
  'Skis or snowboard': 'Esquís o snowboard',
  'Musical instrument': 'Instrumento musical',
  'Folding wheelchair': 'Silla de ruedas plegable',
  'Large equipment case': 'Estuche de equipo grande',
  // ATMOSPHERE_PREFS
  'Conversation welcome': 'Conversación bienvenida',
  'Minimal conversation': 'Conversación mínima',
  'No phone calls from driver': 'Sin llamadas del conductor',
  'No music': 'Sin música',
  'Soft music': 'Música suave',
  'Passenger controls music': 'El pasajero controla la música',
  'Business-call friendly': 'Apto para llamadas de trabajo',
  'Sleep-friendly ride': 'Viaje apto para dormir',
  // PET_PREFS
  'No pet': 'Sin mascota',
  'Service animal': 'Animal de servicio',
  'Small pet in carrier': 'Mascota pequeña en transportadora',
  'Large pet in carrier': 'Mascota grande en transportadora',
  'Small dog without carrier': 'Perro pequeño sin transportadora',
  'Large dog without carrier': 'Perro grande sin transportadora',
  'Multiple pets': 'Varias mascotas',
  // PICKUP_PREFS
  'Standard curbside pickup': 'Recogida estándar en la acera',
  'Driver calls on arrival': 'El conductor llama al llegar',
  'Driver sends text on arrival': 'El conductor envía un mensaje al llegar',
  'Driver meets at the door': 'El conductor espera en la puerta',
  'Driver meets in the lobby': 'El conductor espera en el lobby',
  'Avoid honking': 'Evitar tocar la bocina',
  'Text only, no calls': 'Solo mensajes, sin llamadas',
  'Extra pickup time needed': 'Necesita tiempo extra para la recogida',
  // DRIVER_LANGUAGE_PREFS
  'English': 'Inglés',
  'Spanish': 'Español',
  'French': 'Francés',
  'Portuguese': 'Portugués',
  'Other': 'Otro',
};

// Translates a COMFORT_PREFS/CLIMATE_PREFS/CLEANLINESS_PREFS/SPECIFIC_TEMP
// value for display only — pass the raw English value (the actual stored/
// filter-key string) and the current t.locale; returns it unchanged for
// English or an unmapped value.
export function translatePrefLabel(label: string, locale: string): string {
  if (!locale.startsWith('es')) return label;
  return PREF_LABELS_ES[label] ?? label;
}
