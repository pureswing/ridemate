// Composed text styles — the single place that turns a design-file rule like
// "font-body semibold, text-xs, tracking-caps, uppercase" into the RN properties
// that actually render it correctly on Android (weight-specific fontFamily, no
// fontWeight, letterSpacing computed in points from the source's em ratio).
//
// Screens should reach for these instead of re-deriving fontFamily/fontSize/
// letterSpacing/lineHeight inline — that's what let three different bugs (thin
// text, wrong typeface, hand-guessed tracking) ship on one screen this session.
// See the typography-audit artifact for the root-cause writeup.
import { TextStyle } from 'react-native';
import { fonts } from './themes';

// tokens/typography.css --tracking-* (em ratios — multiply by fontSize for pt).
export const tracking = {
  tighter: -0.02,
  tight: -0.01,
  normal: 0,
  wide: 0.08,
  caps: 0.18,
} as const;

// tokens/typography.css --leading-* (unitless line-height multipliers).
export const leading = {
  tight: 1.05,
  snug: 1.2,
  normal: 1.5,
  relaxed: 1.65,
} as const;

export function letterSpacingFor(fontSize: number, ratio: number): number {
  return Math.round(fontSize * ratio * 100) / 100;
}

function textStyle(fontSize: number, fontFamily: string, trackingRatio: number, leadingRatio: number): TextStyle {
  return {
    fontFamily,
    fontSize,
    letterSpacing: letterSpacingFor(fontSize, trackingRatio),
    lineHeight: Math.round(fontSize * leadingRatio),
  };
}

export const textStyles = {
  // Small uppercase caps label (greeting lines, section eyebrows, taglines).
  // font-body bold + tracking-caps, per the design's own eyebrow usage.
  eyebrow: { ...textStyle(11, fonts.bodyBold, tracking.caps, leading.snug), textTransform: 'uppercase' as const },

  // Display headings — font-display, tracking-tighter, tight leading.
  h1: textStyle(36, fonts.displayExtraBold, tracking.tighter, leading.tight),
  h2: textStyle(28, fonts.displayBold, tracking.tighter, leading.tight),
  h3: textStyle(22, fonts.displayBold, tracking.tight, leading.snug),

  // Body copy — font-body regular, relaxed leading for paragraphs.
  body: textStyle(16, fonts.bodyRegular, tracking.normal, leading.relaxed),
  bodySm: textStyle(14, fonts.bodyRegular, tracking.normal, leading.relaxed),

  // Form field / section labels — font-body semibold, snug leading, no uppercase.
  label: textStyle(14, fonts.bodySemibold, tracking.normal, leading.snug),

  // Fine print — hints, captions, timestamps.
  caption: textStyle(12, fonts.bodyRegular, tracking.normal, leading.normal),
} satisfies Record<string, TextStyle>;
