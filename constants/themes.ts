// "Miami Sunset" — the single shipped theme (RideMate Design System, tokens/colors.css [data-theme="day"]).
// The dark "Miami Nights" pass was retired for MVP simplicity — no theme toggle.

export interface AppTheme {
  // Backgrounds
  background: string;
  surface: string;
  surfaceAlt: string;
  // Header
  headerGradient: [string, string];
  headerText: string;
  headerSubtext: string;
  headerInputBg: string;
  // Text
  text: string;
  textSecondary: string;
  muted: string;
  // Accents
  primary: string;
  secondary: string;
  accent: string;
  offer: string;      // driver / pooling
  request: string;    // passenger / ride
  fab: string;
  fabText: string;
  // Cards
  cardBorder: string;
  cardShadowColor: string;
  cardShadowOpacity: number;
  // Filter chips
  chipActiveBg: string;
  chipActiveText: string;
  chipInactiveBg: string;
  chipInactiveText: string;
  chipInactiveBorder: string;
  // Tab bar
  tabBarBg: string;
  tabActive: string;
  tabInactive: string;
  tabBorder: string;
  // Inputs
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  // Status
  danger: string;
  warning: string;
  success: string;
  border: string;
  // Typography
  fontDisplay: string;
  fontItalic: string;
  fontBody: string;
  // Core component tokens (RideMate Design System — tokens/*.css)
  textOnPrimary: string;
  textFaint: string;
  borderGold: string;
  // gold-300 (day) — the pale peach used for secondary text on gradient heroes
  // (e.g. HomeHeader's greeting line + italic accent word).
  gold300: string;
  // cream (day) — off-white used for primary text/icons on gradient heroes,
  // instead of pure white.
  cream: string;
  // gold-400 (tokens/colors.css) — muted tan/gold accent used for icon glyphs
  // and small badges on a --surface-muted background (e.g. address-book slot icons).
  gold400: string;
  // gold-500 (tokens/colors.css [data-theme="day"]) — identical to `primary`
  // (#FF6243), a semantic alias the design system's day pass reuses rather
  // than a distinct gold tone. Kept as its own token (not just `primary`) so
  // call sites that specifically mean "the design's gold-500" stay legible.
  gold500: string;
  badgeWarnBg: string;
  badgeWarnFg: string;
  // Ride-type semantics (Badge/Chip tones) — soft bg + border for each service
  driverText: string;
  driverSoft: string;
  driverBorder: string;
  passengerText: string;
  passengerSoft: string;
  passengerBorder: string;
  courierText: string;
  courierSoft: string;
  courierBorder: string;
  haulingText: string;
  haulingSoft: string;
  haulingBorder: string;
  // Membership tier badge (Donor) — same text/soft/border triad shape as the
  // ride-type semantics above, used on the tier pill/badge and the Membership screen.
  donorText: string;
  donorSoft: string;
  donorBorder: string;
  // Gradients (expo-linear-gradient colors arrays)
  gradientGold: [string, string, string];
  gradientOrchid: [string, string];
  gradientJade: [string, string];
}

// RN shadow style objects (approximate the CSS box-shadow tokens in effects.css —
// RN has no multi-layer or inset shadow support, so these are the closest single-layer match).
export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export const shadows: Record<'xs' | 'sm' | 'md' | 'lg' | 'gold' | 'jade' | 'orchid' | 'goldTight' | 'jadeTight' | 'orchidTight' | 'donorTight', ShadowStyle> = {
  xs:     { shadowColor: '#1E2A32', shadowOffset: { width: 0, height: 1 },  shadowOpacity: 0.06, shadowRadius: 2,  elevation: 1 },
  sm:     { shadowColor: '#1E2A32', shadowOffset: { width: 0, height: 2 },  shadowOpacity: 0.06, shadowRadius: 4,  elevation: 2 },
  md:     { shadowColor: '#1E2A32', shadowOffset: { width: 0, height: 6 },  shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  lg:     { shadowColor: '#1E2A32', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.12, shadowRadius: 36, elevation: 8 },
  gold:   { shadowColor: '#FF6243', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.34, shadowRadius: 24, elevation: 6 },
  jade:   { shadowColor: '#0E9C93', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.30, shadowRadius: 24, elevation: 6 },
  orchid: { shadowColor: '#FF6243', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.30, shadowRadius: 24, elevation: 6 },
  // Tighter, more opaque versions for small elements (chips) — a small radius/offset
  // hugs the shape instead of blooming into a big soft "cloud" underneath it.
  goldTight:   { shadowColor: '#FF6243', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  jadeTight:   { shadowColor: '#0E9C93', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  orchidTight: { shadowColor: '#FF6243', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  donorTight: { shadowColor: '#C97BFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
};

export const theme: AppTheme = {
  background:     '#FFFAF5',
  surface:        '#FFFFFF',
  surfaceAlt:     '#FFF3E9',
  headerGradient: ['#FF6243', '#FFC15E'],
  headerText:     '#FFFFFF',
  headerSubtext:  'rgba(255,255,255,0.75)',
  headerInputBg:  'rgba(255,255,255,0.25)',
  text:           '#1E2A32',
  textSecondary:  '#3A4A55',
  muted:          '#5E707B',
  primary:        '#FF6243',
  secondary:      '#0E9C93',
  accent:         '#FCA311',
  offer:          '#0E9C93',
  request:        '#FF6243',
  fab:            '#FF6243',
  fabText:        '#FFFFFF',
  cardBorder:     'rgba(30,42,50,0.08)',
  cardShadowColor:   '#1E2A32',
  cardShadowOpacity: 0.08,
  chipActiveBg:     '#FFF1ED',
  chipActiveText:   '#FF6243',
  chipInactiveBg:   '#FFFFFF',
  chipInactiveText: '#5E707B',
  chipInactiveBorder: '#C7D2D7',
  tabBarBg:   '#FFFFFF',
  tabActive:  '#FF6243',
  tabInactive:'#97A6AE',
  tabBorder:  'rgba(30,42,50,0.08)',
  inputBg:        'rgba(255,255,255,0.25)',
  inputBorder:    'rgba(255,255,255,0.4)',
  inputText:      '#FFFFFF',
  inputPlaceholder: 'rgba(255,255,255,0.7)',
  danger:  '#ED4A2B',
  warning: '#FCA311',
  success: '#2BA84A',
  border:  '#C7D2D7',
  fontDisplay: 'BricolageGrotesque_700Bold',
  fontItalic:  'BricolageGrotesque_600SemiBold',
  fontBody:    'PlusJakartaSans_400Regular',
  textOnPrimary: '#FFFFFF',
  textFaint:     '#97A6AE',
  borderGold:    'rgba(252,163,17,0.5)',
  gold300:       '#FFE2C2',
  cream:         '#FFF8F0',
  gold400:       '#D9B871',
  gold500:       '#FF6243',
  badgeWarnBg:   '#FBE3A6',
  badgeWarnFg:   '#7A4D08',
  driverText:      '#0A7E77',
  driverSoft:      '#E6FAF8',
  driverBorder:    '#8DE3DC',
  passengerText:   '#ED4A2B',
  passengerSoft:   '#FFF1ED',
  passengerBorder: '#FFC2AF',
  // Courier/hauling have no "day" pass in the source design system (tokens/colors.css
  // only re-themes driver/passenger) — their raw night-mode fg (light cyan/peach) is
  // unreadable on a light card, so these use the -600 shade instead for contrast.
  courierText:   '#08637A',
  courierSoft:   'rgba(14,165,196,0.14)',
  courierBorder: 'rgba(14,165,196,0.34)',
  haulingText:   '#9E4A14',
  haulingSoft:   'rgba(224,123,57,0.14)',
  haulingBorder: 'rgba(224,123,57,0.34)',
  // Donor purple has no existing token — new accent, scoped to the donor tier badge only.
  donorText:   '#C97BFF',
  donorSoft:   'rgba(201,123,255,0.14)',
  donorBorder: 'rgba(201,123,255,0.34)',
  gradientGold:   ['#FF6243', '#FF9B57', '#FFC15E'],
  gradientOrchid: ['#FF7A5E', '#ED4A2B'],
  gradientJade:   ['#1FB6AC', '#0E9C93'],
};

// Font weight/style variants (typography.css --weight-*) — Android drops custom
// fontFamily+fontWeight/fontStyle combos that don't have a matching TTF (can even
// fall back to the system font for the whole surrounding text tree), so every
// weight AND style used in the UI needs its own loaded file name here (see
// app/_layout.tsx) — never pair fontStyle: 'italic' with a non-italic file.
export const fonts = {
  bodyRegular:  'PlusJakartaSans_400Regular',
  bodyMedium:   'PlusJakartaSans_500Medium',
  bodySemibold: 'PlusJakartaSans_600SemiBold',
  bodyBold:     'PlusJakartaSans_700Bold',
  bodyExtraBold: 'PlusJakartaSans_800ExtraBold',
  bodyItalic:   'PlusJakartaSans_700Bold_Italic',
  displaySemibold:  'BricolageGrotesque_600SemiBold',
  displayBold:      'BricolageGrotesque_700Bold',
  displayExtraBold: 'BricolageGrotesque_800ExtraBold',
};

// Caps how much the OS accessibility text-size setting can grow labels on fixed-
// height UI chrome (buttons/chips/badges) — content text (ride descriptions, chat)
// should NOT use this, it should keep scaling freely for accessibility.
export const chromeMaxFontSizeMultiplier = 1.3;

// Design-token scales that aren't per-theme (spacing.css) — RN-safe raw values.
export const radii = {
  xs: 6, sm: 10, md: 14, lg: 20, xl: 28, '2xl': 36, pill: 999,
};

export const controlHeight = {
  sm: 36, md: 44, lg: 54,
};

export const spacing = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80,
};

// Hex -> rgba() with a given opacity — for borders/overlays that need to tint
// toward a theme color (e.g. text color) at partial transparency, since RN
// has no CSS color-mix()/alpha-hex shorthand.
export function withOpacity(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
