// English-only enumerated chip lists for the ride post form (design system's
// PostRide.jsx) — kept untranslated, matching the precedent already in this
// screen (DEPARTURE/ARRIVAL labels are hardcoded English too) rather than
// half-translating ~50 more strings. See i18n.ts's comment on this decision.
// Shared between app/post/ride.tsx (create) and app/ride/edit/[id].tsx (edit).
export const RULES = ['No smoking', 'No food', 'Pets OK', 'Music OK', 'A/C on', 'Quiet ride', 'Luggage OK'];
export const VEHICLE_TYPES = ['No preference', 'Sedan', 'Large Sedan', 'SUV', 'Large SUV', 'Minivan', 'Passenger Van', 'Luxury Sedan', 'Luxury SUV', 'Electric', 'Hybrid', 'Wheelchair-Accessible Vehicle'];
export const COMFORT_PREFS = ['No preference', 'Extra legroom', 'Front passenger seat', "Captain's chairs", 'Reclining seat', 'Easy-entry seat', 'Minimal climbing or bending', 'Additional personal space', 'Leather interior', 'Executive-class interior', 'Rear passenger controls', 'Privacy partition'];
export const CLIMATE_PREFS = ['No preference', 'Cool vehicle before pickup', 'Warm vehicle before pickup', 'Strong air conditioning', 'Moderate air conditioning', 'Minimal air conditioning', 'Rear climate controls', 'Avoid direct air vents'];
export const SPECIFIC_TEMP = 'Specific temperature';
export const CHILD_SEAT_OPTIONS = ['No child seat needed', 'Rear-facing infant seat', 'Forward-facing child seat', 'High-back booster seat', 'Backless booster seat', 'Space for passenger-provided child seat', 'Multiple child seats', 'Seat provided by passenger or driver', 'Stroller storage', 'Family-friendly vehicle'];
// Ordered shortest-to-longest label so RuleChip's flexWrap row packs tighter
// with fewer trailing gaps — see OversizedSheet.tsx.
export const OVERSIZED_ITEMS = ['Walker', 'Stroller', 'Golf clubs', 'Medical equipment', 'Skis or snowboard', 'Musical instrument', 'Folding wheelchair', 'Large equipment case'];

// Added from a granular-preferences review (2026-07-18) — the subset judged
// compatible with RideMate staying a classified-ads board (self-reported,
// informational, no matching/dispatch/verification implied). See
// project_legal_tnc_compliance memory before extending this list further.
export const ATMOSPHERE_PREFS = ['No preference', 'Conversation welcome', 'Minimal conversation', 'No phone calls from driver', 'No music', 'Soft music', 'Passenger controls music', 'Business-call friendly', 'Sleep-friendly ride'];
export const CLEANLINESS_PREFS = ['Standard clean vehicle', 'Recently cleaned vehicle', 'Fragrance-free', 'No air fresheners', 'Smoke-free', 'Vape-free', 'Pet-hair-free', 'Allergen-conscious', 'Sanitized high-touch surfaces'];
export const PET_PREFS = ['No pet', 'Service animal', 'Small pet in carrier', 'Large pet in carrier', 'Small dog without carrier', 'Large dog without carrier', 'Multiple pets'];
export const PICKUP_PREFS = ['Standard curbside pickup', 'Driver calls on arrival', 'Driver sends text on arrival', 'Driver meets at the door', 'Driver meets in the lobby', 'Avoid honking', 'Text only, no calls', 'Extra pickup time needed'];
export const DRIVER_LANGUAGE_PREFS = ['No preference', 'English', 'Spanish', 'French', 'Portuguese', 'Other'];
