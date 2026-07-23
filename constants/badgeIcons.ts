import { BadgeType } from '@/types';
import { IconName } from '@/constants/icons';

export type BadgeCategory = 'reliability' | 'vehicle' | 'attitude' | 'experience' | 'comfort' | 'cargo';

// Icon + accent color (+ category, for the completion-review detail card)
// per badge type — matches ui_kits/ridemate-app/data.js's RM_BADGE_CATALOG
// and JobCompletionReview.jsx's two badge sets. Colors are this app's
// closest existing theme tokens to the design's CSS vars (driver/gold-400/
// passenger/jade-500), except Cargo's two hex values which the design
// hardcodes directly (no matching theme token).
export const BADGE_ICONS: Record<BadgeType, { icon: IconName; color: string; category: BadgeCategory }> = {
  // driver badges (rider → driver)
  punctual:        { icon: 'punctual',        color: '#D9B871', category: 'reliability' },
  clean_car:       { icon: 'clean_car',       color: '#0A7E77', category: 'vehicle' },
  friendly:        { icon: 'friendly',        color: '#ED4A2B', category: 'attitude' },
  good_music:      { icon: 'good_music',      color: '#B478C8', category: 'experience' },
  fresh_air:       { icon: 'fresh_air',       color: '#0E9C93', category: 'comfort' },
  shares_snacks:   { icon: 'shares_snacks',   color: '#B478C8', category: 'experience' },
  pet_friendly:    { icon: 'pet_friendly',    color: '#0E9C93', category: 'comfort' },
  vip_service:     { icon: 'vip_service',     color: '#D9B871', category: 'experience' },
  good_navigation: { icon: 'good_navigation', color: '#D9B871', category: 'reliability' },
  flexible_hours:  { icon: 'flexible_hours',  color: '#D9B871', category: 'reliability' },
  city_expert:     { icon: 'city_expert',     color: '#D9B871', category: 'reliability' },
  careful_cargo:   { icon: 'careful_cargo',   color: '#E07B39', category: 'cargo' },
  fast_delivery:   { icon: 'fast_delivery',   color: '#0EA5C4', category: 'cargo' },
  // passenger badges (driver → rider)
  on_time:         { icon: 'on_time',         color: '#D9B871', category: 'reliability' },
  respectful:      { icon: 'respectful',      color: '#ED4A2B', category: 'attitude' },
  tidy:            { icon: 'tidy',            color: '#0A7E77', category: 'vehicle' },
  communicative:   { icon: 'communicative',   color: '#ED4A2B', category: 'attitude' },
  // shared between both sets
  great_chat:      { icon: 'great_chat',      color: '#ED4A2B', category: 'attitude' },
};
