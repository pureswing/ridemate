import { RidePostDetailsRide } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

export interface ExtrasGroup {
  label: string;
  items: string[];
}

// Everything from the granular ride-preferences pass EXCEPT accessibility
// (that has its own dedicated icon/sheet in RideCard.tsx/RideCardGrid.tsx) —
// vehicle/comfort/climate/atmosphere/cleanliness/pet/pickup/language, each
// only included if the post actually set it. "No preference" entries are
// the form's default, not a real declared preference, so they're filtered
// out here too.
export function buildExtrasGroups(rideDetails: RidePostDetailsRide | undefined, t: ReturnType<typeof useTranslation>): ExtrasGroup[] {
  if (!rideDetails) return [];
  return [
    { label: t.filterDrawer.featureCategories.vehicleType, items: rideDetails.vehicleType && rideDetails.vehicleType !== 'No preference' ? [rideDetails.vehicleType] : [] },
    { label: t.filterDrawer.featureCategories.climateControl, items: (rideDetails.climatePrefs ?? []).filter((v) => v !== 'No preference') },
    { label: t.filterDrawer.featureCategories.comfort, items: (rideDetails.comfortPrefs ?? []).filter((v) => v !== 'No preference') },
    { label: t.filterDrawer.featureCategories.entertainment, items: (rideDetails.atmospherePrefs ?? []).filter((v) => v !== 'No preference') },
    { label: t.filterDrawer.featureCategories.cleanliness, items: rideDetails.cleanlinessPrefs ?? [] },
    { label: t.filterDrawer.featureCategories.petTransportation, items: rideDetails.petPrefs ?? [] },
    { label: t.filterDrawer.featureCategories.pickupPreferences, items: rideDetails.pickupPrefs ?? [] },
    { label: t.filterDrawer.featureCategories.driverLanguage, items: rideDetails.driverLanguage && rideDetails.driverLanguage !== 'No preference' ? [rideDetails.driverLanguage] : [] },
  ].filter((g) => g.items.length > 0);
}
