/** @type {import('tailwindcss').Config} */
// Tokens mirror the "Miami Sunset" theme from the RideMate Design System
// (tokens/colors.css [data-theme="day"], spacing.css, effects.css).
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary:        '#FF6243',
        primaryLight:   '#FF9B57',
        primarySoft:    '#FFF1ED',
        secondary:      '#0E9C93',
        secondaryLight: '#1FB6AC',
        secondarySoft:  '#E6FAF8',
        accent:         '#FCA311',
        // service semantics
        pooling:  '#0E9C93', // driver
        ride:     '#FF6243', // passenger
        courier:  '#0EA5C4',
        hauling:  '#E07B39',
        // surfaces
        background: '#FFFAF5',
        surface:    '#FFFFFF',
        surfaceAlt: '#FFF3E9',
        // text
        text:          '#1E2A32',
        textSecondary: '#3A4A55',
        muted:         '#5E707B',
        faint:         '#97A6AE',
        textOnPrimary: '#FFFFFF',
        // status
        success: '#2BA84A',
        danger:  '#ED4A2B',
        warning: '#FCA311',
        // borders
        border:       '#C7D2D7',
        borderSubtle: 'rgba(30,42,50,0.08)',
      },
      fontFamily: {
        display: ['BricolageGrotesque_700Bold'],
        body:    ['PlusJakartaSans_400Regular'],
      },
      spacing: {
        '0.5': '2px',
        '18':  '72px',
      },
      borderRadius: {
        xs:   '6px',
        sm:   '10px',
        md:   '14px',
        lg:   '20px',
        xl:   '28px',
        '2xl':'36px',
        pill: '999px',
      },
      boxShadow: {
        // approximations — RN only renders a single shadow layer, see themes.ts for elevation pairing
        xs: '0 1px 2px rgba(30,42,50,0.06)',
        sm: '0 2px 4px rgba(30,42,50,0.06)',
        md: '0 6px 16px rgba(30,42,50,0.08)',
        lg: '0 16px 36px rgba(30,42,50,0.12)',
        coral: '0 10px 24px rgba(255,98,67,0.34)',
        teal:  '0 10px 24px rgba(14,156,147,0.30)',
      },
    },
  },
  plugins: [],
};
