export type UserRole = 'driver' | 'passenger';
export type PostType = 'offer' | 'request';
export type PostStatus = 'active' | 'filled' | 'cancelled' | 'expired';
export type PostVisibility = 'public' | 'private';
export type ContactMethod = 'in_app' | 'whatsapp' | 'phone' | 'email';
export type RidePostKind = 'ride' | 'package' | 'hauling';
// RM_ACCESS_OPTIONS catalog — self-described rider accessibility needs, stored
// on the profile (see supabase/migrations/008_accessibility_needs.sql).
export type AccessibilityNeed =
  | 'hard-of-hearing'
  | 'low-vision'
  | 'limited-mobility'
  | 'no-heavy-lift'
  | 'wheelchair'
  | 'prefers-text'
  | 'service-animal'
  | 'sensory';
export type SubscriptionStatus = 'free' | 'active' | 'expired' | 'cancelled';
export type SubscriptionPlan = 'monthly' | 'annual' | 'donation';
export type AgreementStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'no_show';

// Driver badges (given by passenger to driver)
export type DriverBadgeType = 'clean_car' | 'punctual' | 'friendly' | 'good_vibes' | 'smooth_ride';
// Passenger badges (given by driver to passenger)
export type PassengerBadgeType = 'on_time' | 'communicative' | 'respectful' | 'tidy' | 'great_company';
export type BadgeType = DriverBadgeType | PassengerBadgeType;

export type StrikeLevel = 0 | 1 | 2 | 3;

export interface Profile {
  id: string;
  full_name: string;
  username?: string;
  phone?: string;
  avatar_url?: string;
  default_role: UserRole;
  disclaimer_accepted_at?: string;
  is_active: boolean;
  accessibility_needs: AccessibilityNeed[];
  // supabase/migrations/012_profile_extra_fields.sql
  home_city?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  plan?: SubscriptionPlan;
  amount_donated?: number;
  period_start?: string;
  period_end?: string;
  created_at: string;
}

// Kind-specific fields that don't need SQL-level filtering yet — stored in
// ride_posts.details jsonb (see supabase/migrations/007_post_kinds.sql).
// Ride-specific fields that DO get filtered/displayed prominently (round_trip,
// airport, airport_leg, flight_number) are real RidePost columns instead.
export interface RidePostDetailsRide {
  rules?: Record<string, boolean>;
  vehicleType?: string;
  comfortPrefs?: string[];
  climatePrefs?: string[];
  tempPref?: number;
  bags?: number;
  bagTypes?: string[];
  oversizedInfo?: { types: string[]; other: string }[];
  childSeatPrefs?: string[];
  adults?: number;
  children?: number;
  eventName?: string;
  vehiclesNeeded?: number;
}

export interface RidePostDetailsPackage {
  qty?: number;
  packageSize?: 'envelope' | 'small' | 'large' | 'oversized';
  contentTags?: string[];
  handling?: string[];
  declaredValue?: number;
  prohibitedConfirmed?: string[];
  inspectionOk?: boolean;
  oathAccepted?: boolean;
  oathAcceptedAt?: string;
}

export interface RidePostDetailsHauling {
  loadTypes?: string[];
  loadSize?: 'suv' | 'half' | 'full' | 'multi';
  disposal?: 'driver' | 'address';
  dropoffAddress?: string;
  access?: string[];
  helpNeeded?: boolean;
  hazardous?: boolean;
  prohibitedConfirmed?: string[];
  photoUrl?: string;
}

export type RidePostDetails = RidePostDetailsRide | RidePostDetailsPackage | RidePostDetailsHauling;

export interface RidePost {
  id: string;
  user_id: string;
  type: PostType;
  kind: RidePostKind;
  visibility: PostVisibility;
  goes_public_at?: string;
  origin_city: string;
  origin_address?: string;
  destination_city: string;
  destination_address?: string;
  origin_lat?: number;
  origin_lng?: number;
  destination_lat?: number;
  destination_lng?: number;
  scheduled_at: string;
  seats_available?: number;
  suggested_donation?: number;
  description?: string;
  contact_method: ContactMethod;
  contact_value?: string;
  status: PostStatus;
  views_count: number;
  round_trip: boolean;
  airport: boolean;
  airport_leg?: 'to' | 'from';
  flight_number?: string;
  route_map_url?: string;
  details: RidePostDetails;
  created_at: string;
  updated_at: string;
  expires_at: string;
  // Edit-tracking fields
  original_scheduled_at?: string;
  original_suggested_donation?: number;
  info_updated?: boolean;
  edited_at?: string;
  profile?: Pick<Profile, 'full_name' | 'avatar_url' | 'default_role'> & {
    // Joined so RideCard can show Avatar's `verified` badge — self-certified
    // insurance only (VehicleProfile.insurance_self_certified), never a
    // verification the app itself performs.
    vehicle_profiles?: Pick<VehicleProfile, 'insurance_self_certified'>[];
  };
}

// supabase/migrations/009_route_price_stats.sql — get_route_price_stats() RPC.
// avg_donation/sample_size are both null-ish (0 rows) when there's no history
// for the route yet; the UI rule is: sample_size < 3 means "not enough data",
// never present it as a market rate.
export interface RouteStats {
  avg_donation: number | null;
  sample_size: number;
}

export interface ContactReveal {
  id: string;
  post_id: string;
  requester_id: string;
  revealed_at: string;
  post?: RidePost;
}

export interface UserFavorite {
  id: string;
  rider_id: string;
  driver_id: string;
  city: string;
  created_at: string;
  driver?: Pick<Profile, 'full_name' | 'avatar_url'>;
}

export interface RideAgreement {
  id: string;
  post_id: string;
  driver_id: string;
  rider_id: string;
  driver_confirmed_at?: string;
  rider_confirmed_at?: string;
  status: AgreementStatus;
  created_at: string;
  updated_at: string;
  post?: Pick<RidePost, 'origin_city' | 'destination_city' | 'scheduled_at' | 'type'>;
  driver?: Pick<Profile, 'full_name' | 'avatar_url'>;
  rider?: Pick<Profile, 'full_name' | 'avatar_url'>;
}

export interface RideBadge {
  id: string;
  agreement_id: string;
  giver_id: string;
  receiver_id: string;
  badge_type: BadgeType;
  created_at: string;
}

export interface BadgeCount {
  badge_type: BadgeType;
  count: number;
}

export interface NoShowReport {
  id: string;
  agreement_id: string;
  reporter_id: string;
  reported_id: string;
  reported_at: string;
}

export type VehicleAmenity =
  // Charging & Tech
  | 'ev_station'
  | 'bluetooth'
  | 'wifi'
  | 'dashcam'
  // Seating & Comfort
  | 'seat_recline'
  | 'seat_heater'
  | 'baby_seat'
  | 'ac_unit'
  | 'accessible'
  // Smoke — dual state (select one)
  | 'smoking'
  | 'smoke_free'
  // Vape — restriction only
  | 'vape_free'
  // Cannabis — dual state
  | 'cannabis_ok'
  | 'cannabis_free'
  // Food & Drinks
  | 'glass_cocktail'
  | 'food_off'
  // Volume — dual state
  | 'music_ok'
  | 'quiet_ride'
  // Extras
  | 'celebration'
  | 'hand_wash'
  | 'pets_ok'
  | 'no_pets';

export interface AmenityDetail {
  choices: string[];
  note: string;
}

export type AmenityDetails = Partial<Record<VehicleAmenity, AmenityDetail>>;

// supabase/migrations/011_vehicle_kind.sql — up to 2 vehicles per user, one per
// kind (unique on user_id+kind, not just user_id anymore).
export type VehicleKind = 'rides_courier' | 'hauling';

export interface VehicleProfile {
  id: string;
  user_id: string;
  kind: VehicleKind;
  vin?: string;
  make: string;
  model: string;
  trim?: string;
  year: number;
  color: string;
  fuel_type?: string;
  seats?: number;
  photo_url?: string;
  amenities: VehicleAmenity[];
  amenity_details?: AmenityDetails;
  insurance_self_certified: boolean;
  created_at: string;
  updated_at: string;
}

export interface TripRecord {
  agreementId: string;
  origin: string;
  destination: string;
  scheduledAt: string;
  suggestedDonation?: number;
  otherPartyName: string;
  myRole: 'driver' | 'rider';
  distanceText?: string;
  durationText?: string;
}
