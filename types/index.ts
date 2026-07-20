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
  accessibility_note?: string;
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
  // Added from the granular-preferences review (2026-07-18). All optional,
  // self-reported, informational-only — see constants/rideFormOptions.ts and
  // constants/accessibilityOptions.ts for the option catalogs.
  accessibilityNeeds?: AccessibilityNeed[];
  atmospherePrefs?: string[];
  cleanlinessPrefs?: string[];
  petPrefs?: string[];
  pickupPrefs?: string[];
  driverLanguage?: string;
  // Intermediate stops, in order — plain address text (same free-text the
  // "add stop" rows collect), routed through via the Directions API as
  // waypoints. See services/routeMap.ts.
  stops?: string[];
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
  // Up to MAX_HAULING_PHOTOS (see app/post/hauling.tsx) — each just a
  // supabase.storage "hauling-photos" public URL, same as the old single
  // photoUrl. `photoUrl` is kept optional for reading posts saved before
  // this became an array.
  photoUrls?: string[];
  /** @deprecated superseded by photoUrls — still read for old posts */
  photoUrl?: string;
  // When true, scheduled_at holds a placeholder timestamp (not a real
  // commitment) and the UI shows "Anytime this week" instead of the exact
  // date/time — haulers often care less about a fixed slot than ride
  // passengers do.
  flexibleDate?: boolean;
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
  // supabase/migrations/027_price_mode.sql — 'firm' hides the "OBO" suffix
  // wherever suggested_donation is shown.
  price_mode?: 'firm' | 'open';
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
  duration_text?: string;
  duration_seconds?: number;
  distance_text?: string;
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

// Address Book — persisted per (user, slot). See
// supabase/migrations/018_saved_addresses.sql.
export interface SavedAddress {
  id: string;
  user_id: string;
  slot_id: string;
  value: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

// In-app messaging — replaces the external contact-method flow (WhatsApp/
// phone/email). One conversation per (post, requester) pair — see
// supabase/migrations/017_messaging.sql.
export interface Conversation {
  id: string;
  post_id: string;
  post_owner_id: string;
  requester_id: string;
  created_at: string;
  last_message_at: string;
  post?: Pick<RidePost, 'id' | 'kind' | 'type' | 'origin_city' | 'destination_city' | 'scheduled_at'>;
  post_owner?: Pick<Profile, 'full_name' | 'avatar_url'>;
  requester?: Pick<Profile, 'full_name' | 'avatar_url'>;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at?: string;
  // supabase/migrations/023_message_is_system.sql — true for the automatic
  // "offer accepted" confirmation, rendered as a centered system pill
  // instead of a chat bubble. sender_id is still a real participant (RLS
  // requires it), this flag is purely a rendering hint.
  is_system?: boolean;
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
  post?: Pick<RidePost, 'origin_city' | 'destination_city' | 'scheduled_at' | 'type' | 'kind' | 'suggested_donation'>;
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

// supabase/migrations/024_user_reports.sql — write-only from the app; a
// human reviews these directly in the Supabase dashboard for now.
export interface UserReport {
  id: string;
  reporter_id: string;
  reported_id: string;
  reasons: string[];
  note?: string;
  created_at: string;
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
  plate?: string;
  vehicle_type?: string;
  fuel_type?: string;
  seats?: number;
  photo_url?: string;
  amenities: VehicleAmenity[];
  amenity_details?: AmenityDetails;
  insurance_self_certified: boolean;
  created_at: string;
  updated_at: string;
}

// supabase/migrations/026_notifications.sql — rows are written only by
// SECURITY DEFINER triggers (new message, agreement created/completed,
// badge received), never inserted directly by the client. `data` carries
// whatever ids the notification deep-links to (conversation_id, agreement_id...).
export type NotificationType = 'message' | 'agreement_created' | 'agreement_completed' | 'badge_received';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  data: Record<string, string>;
  read_at?: string;
  created_at: string;
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
