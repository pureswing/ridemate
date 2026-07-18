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
export const OVERSIZED_ITEMS = ['Golf clubs', 'Skis or snowboard', 'Folding wheelchair', 'Walker', 'Stroller', 'Musical instrument', 'Medical equipment', 'Large equipment case'];
