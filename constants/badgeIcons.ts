import { BadgeType } from '@/types';
import { IconName } from '@/constants/icons';

// Icon + accent color per badge type — shared between the own-profile
// community badges row and the public user-profile screen.
export const BADGE_ICONS: Record<BadgeType, { icon: IconName; color: string }> = {
  clean_car:     { icon: 'car',          color: '#0E9C93' },
  punctual:      { icon: 'schedule',     color: '#B8860B' },
  friendly:      { icon: 'handshake',    color: '#ED4A2B' },
  good_vibes:    { icon: 'music_ok',     color: '#D6409F' },
  smooth_ride:   { icon: 'route',        color: '#0A7E77' },
  on_time:       { icon: 'schedule',     color: '#B8860B' },
  communicative: { icon: 'chat',         color: '#08637A' },
  respectful:    { icon: 'handshake',    color: '#ED4A2B' },
  tidy:          { icon: 'check_circle', color: '#0A7E77' },
  great_company: { icon: 'star',         color: '#9E4A14' },
};
