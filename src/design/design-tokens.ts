/**
 * LocalGenius Sites — Design Token System
 *
 * Two theme variants:
 *   "Craft"        — restaurants, cafes, bakeries, food & beverage
 *   "Professional" — plumbers, lawyers, consultants, tradespeople
 *
 * Tokens are intentional, not arbitrary. Every value is chosen for
 * what it communicates to the business owner's customers — not for
 * what looked good in a mood board.
 */

// ---------------------------------------------------------------------------
// Primitives — raw values, never used directly in components
// ---------------------------------------------------------------------------

const primitive = {
  // Warm neutrals — the backbone of both themes
  stone: {
    50:  '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
    950: '#0c0a09',
  },

  // Craft amber — warmth, appetite, handmade quality
  amber: {
    50:  '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Professional slate — trustworthy, calm authority
  slate: {
    50:  '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Professional navy — credibility, depth
  navy: {
    50:  '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Success / confirmation states (shared)
  green: {
    50:  '#f0fdf4',
    100: '#dcfce7',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },

  // Pure values
  white: '#ffffff',
  black: '#000000',
} as const;

// ---------------------------------------------------------------------------
// Typography Scale
// ---------------------------------------------------------------------------

export const typography = {
  // Font families
  // Craft: humanist serif for warmth + modern sans for legibility
  // Professional: geometric sans for authority + readable body
  fontFamily: {
    craft: {
      display: "'Lora', 'Georgia', serif",
      body:    "'Inter', 'system-ui', sans-serif",
    },
    professional: {
      display: "'Inter', 'system-ui', sans-serif",
      body:    "'Inter', 'system-ui', sans-serif",
    },
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },

  // Size scale — fluid where it matters
  fontSize: {
    xs:   '0.75rem',   //  12px
    sm:   '0.875rem',  //  14px
    base: '1rem',      //  16px
    lg:   '1.125rem',  //  18px
    xl:   '1.25rem',   //  20px
    '2xl': '1.5rem',   //  24px
    '3xl': '1.875rem', //  30px
    '4xl': '2.25rem',  //  36px
    '5xl': '3rem',     //  48px
    '6xl': '3.75rem',  //  60px
    '7xl': '4.5rem',   //  72px
  },

  fontWeight: {
    light:    '300',
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
    extrabold: '800',
  },

  lineHeight: {
    tight:   '1.2',
    snug:    '1.35',
    normal:  '1.5',
    relaxed: '1.65',
    loose:   '1.8',
  },

  letterSpacing: {
    tighter: '-0.04em',
    tight:   '-0.02em',
    normal:  '0',
    wide:    '0.04em',
    wider:   '0.08em',
    widest:  '0.16em',
  },
} as const;

// ---------------------------------------------------------------------------
// Spacing Scale — 4px base unit
// ---------------------------------------------------------------------------

export const spacing = {
  0:    '0',
  px:   '1px',
  0.5:  '0.125rem',  //  2px
  1:    '0.25rem',   //  4px
  1.5:  '0.375rem',  //  6px
  2:    '0.5rem',    //  8px
  2.5:  '0.625rem',  //  10px
  3:    '0.75rem',   //  12px
  4:    '1rem',      //  16px
  5:    '1.25rem',   //  20px
  6:    '1.5rem',    //  24px
  8:    '2rem',      //  32px
  10:   '2.5rem',    //  40px
  12:   '3rem',      //  48px
  16:   '4rem',      //  64px
  20:   '5rem',      //  80px
  24:   '6rem',      //  96px
  32:   '8rem',      // 128px
  40:   '10rem',     // 160px
  48:   '12rem',     // 192px
  64:   '16rem',     // 256px
} as const;

// ---------------------------------------------------------------------------
// Breakpoints
// ---------------------------------------------------------------------------

export const breakpoints = {
  sm:  '640px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  '2xl': '1536px',
} as const;

// ---------------------------------------------------------------------------
// Border Radius
// ---------------------------------------------------------------------------

export const radius = {
  none:  '0',
  sm:    '0.25rem',
  md:    '0.5rem',
  lg:    '0.75rem',
  xl:    '1rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
  full:  '9999px',
} as const;

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------

export const shadows = {
  sm:  '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md:  '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  lg:  '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
  xl:  '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.18)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

// ---------------------------------------------------------------------------
// Motion — deliberate, never decorative
// ---------------------------------------------------------------------------

export const motion = {
  duration: {
    instant:  '80ms',
    fast:     '150ms',
    normal:   '250ms',
    slow:     '400ms',
    reveal:   '800ms',   // The site reveal — give it room to breathe
    stagger:  '120ms',   // Delay between staggered children
  },
  easing: {
    linear:      'linear',
    easeIn:      'cubic-bezier(0.4, 0, 1, 1)',
    easeOut:     'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut:   'cubic-bezier(0.4, 0, 0.2, 1)',
    spring:      'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Slight overshoot — alive
    reveal:      'cubic-bezier(0.16, 1, 0.3, 1)',           // Expo ease-out — confident arrival
  },
} as const;

// ---------------------------------------------------------------------------
// THEME: Craft
// Restaurants, cafes, bakeries. Warmth. Appetite. Handmade quality.
// The customer should feel hungry and welcome before they read a word.
// ---------------------------------------------------------------------------

export const craftTheme = {
  name: 'craft' as const,

  color: {
    // Backgrounds
    bg: {
      base:     primitive.stone[50],    // Warm off-white — not clinical white
      elevated: primitive.white,
      sunken:   primitive.stone[100],
      overlay:  'rgba(28, 25, 23, 0.6)',
    },

    // Surfaces (cards, panels)
    surface: {
      default:  primitive.white,
      muted:    primitive.stone[100],
      subtle:   primitive.stone[200],
    },

    // Brand — amber anchors the palette in warmth
    brand: {
      default:  primitive.amber[600],
      hover:    primitive.amber[700],
      active:   primitive.amber[800],
      subtle:   primitive.amber[50],
      muted:    primitive.amber[100],
    },

    // Text hierarchy
    text: {
      primary:   primitive.stone[900],
      secondary: primitive.stone[600],
      tertiary:  primitive.stone[400],
      inverse:   primitive.white,
      brand:     primitive.amber[700],
      link:      primitive.amber[700],
      linkHover: primitive.amber[800],
    },

    // Borders
    border: {
      default: primitive.stone[200],
      muted:   primitive.stone[100],
      strong:  primitive.stone[300],
      brand:   primitive.amber[300],
    },

    // Semantic states
    success: {
      default: primitive.green[600],
      subtle:  primitive.green[50],
      muted:   primitive.green[100],
    },
  },

  typography: {
    fontFamily: typography.fontFamily.craft,
    // Craft display: Lora brings warmth and personality
    display: {
      hero:    { size: typography.fontSize['6xl'],  weight: typography.fontWeight.bold,     lineHeight: typography.lineHeight.tight },
      heading: { size: typography.fontSize['4xl'],  weight: typography.fontWeight.bold,     lineHeight: typography.lineHeight.tight },
      section: { size: typography.fontSize['2xl'],  weight: typography.fontWeight.semibold, lineHeight: typography.lineHeight.snug  },
      label:   { size: typography.fontSize.sm,      weight: typography.fontWeight.semibold, letterSpacing: typography.letterSpacing.widest },
    },
    body: {
      large:   { size: typography.fontSize.lg,   lineHeight: typography.lineHeight.relaxed },
      default: { size: typography.fontSize.base, lineHeight: typography.lineHeight.relaxed },
      small:   { size: typography.fontSize.sm,   lineHeight: typography.lineHeight.normal  },
    },
  },

  // Section-specific visual treatments
  sections: {
    hero: {
      overlayGradient: 'linear-gradient(to bottom, rgba(28,25,23,0.4) 0%, rgba(28,25,23,0.7) 100%)',
      headlineColor:   primitive.white,
      sublineColor:    'rgba(255,255,255,0.88)',
    },
    menu: {
      dividerColor:    primitive.amber[200],
      priceColor:      primitive.amber[700],
      categoryFont:    typography.fontFamily.craft.display,
    },
    hours: {
      dayFont:         typography.fontFamily.craft.body,
      highlightColor:  primitive.amber[600],
    },
  },
} as const;

// ---------------------------------------------------------------------------
// THEME: Professional
// Plumbers, lawyers, consultants. Trust. Competence. Reliability.
// The customer should feel that they are in capable hands.
// ---------------------------------------------------------------------------

export const professionalTheme = {
  name: 'professional' as const,

  color: {
    // Backgrounds
    bg: {
      base:     primitive.slate[50],    // Cool, clean — signals orderliness
      elevated: primitive.white,
      sunken:   primitive.slate[100],
      overlay:  'rgba(15, 23, 42, 0.65)',
    },

    // Surfaces
    surface: {
      default:  primitive.white,
      muted:    primitive.slate[100],
      subtle:   primitive.slate[200],
    },

    // Brand — navy signals authority, not aggression
    brand: {
      default:  primitive.navy[700],
      hover:    primitive.navy[800],
      active:   primitive.navy[900],
      subtle:   primitive.navy[50],
      muted:    primitive.navy[100],
    },

    // Text hierarchy
    text: {
      primary:   primitive.slate[900],
      secondary: primitive.slate[600],
      tertiary:  primitive.slate[400],
      inverse:   primitive.white,
      brand:     primitive.navy[700],
      link:      primitive.navy[700],
      linkHover: primitive.navy[900],
    },

    // Borders
    border: {
      default: primitive.slate[200],
      muted:   primitive.slate[100],
      strong:  primitive.slate[300],
      brand:   primitive.navy[200],
    },

    // Semantic states
    success: {
      default: primitive.green[600],
      subtle:  primitive.green[50],
      muted:   primitive.green[100],
    },
  },

  typography: {
    fontFamily: typography.fontFamily.professional,
    // Professional: Inter all the way — clarity is credibility
    display: {
      hero:    { size: typography.fontSize['6xl'],  weight: typography.fontWeight.extrabold, lineHeight: typography.lineHeight.tight, letterSpacing: typography.letterSpacing.tight },
      heading: { size: typography.fontSize['4xl'],  weight: typography.fontWeight.bold,      lineHeight: typography.lineHeight.tight },
      section: { size: typography.fontSize['2xl'],  weight: typography.fontWeight.semibold,  lineHeight: typography.lineHeight.snug  },
      label:   { size: typography.fontSize.xs,      weight: typography.fontWeight.semibold,  letterSpacing: typography.letterSpacing.widest },
    },
    body: {
      large:   { size: typography.fontSize.lg,   lineHeight: typography.lineHeight.relaxed },
      default: { size: typography.fontSize.base, lineHeight: typography.lineHeight.relaxed },
      small:   { size: typography.fontSize.sm,   lineHeight: typography.lineHeight.normal  },
    },
  },

  // Section-specific visual treatments
  sections: {
    hero: {
      overlayGradient: 'linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(30,58,138,0.75) 100%)',
      headlineColor:   primitive.white,
      sublineColor:    'rgba(255,255,255,0.85)',
    },
    services: {
      cardBorderTop:   `4px solid ${primitive.navy[600]}`,
      iconColor:       primitive.navy[600],
      numberColor:     primitive.navy[200],
    },
    testimonials: {
      quoteColor:      primitive.navy[300],
      starColor:       '#f59e0b',            // Amber for stars — universal
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Unified theme type and selector
// ---------------------------------------------------------------------------

export type Theme = typeof craftTheme | typeof professionalTheme;
export type ThemeName = 'craft' | 'professional';

export const themes = {
  craft:        craftTheme,
  professional: professionalTheme,
} as const;

export function getTheme(name: ThemeName): Theme {
  return themes[name];
}

// ---------------------------------------------------------------------------
// CSS Custom Property generator — call this to emit CSS variables
// ---------------------------------------------------------------------------

export function generateCSSVariables(theme: Theme): string {
  const t = theme;
  return `
    --color-bg-base:       ${t.color.bg.base};
    --color-bg-elevated:   ${t.color.bg.elevated};
    --color-bg-sunken:     ${t.color.bg.sunken};
    --color-surface:       ${t.color.surface.default};
    --color-surface-muted: ${t.color.surface.muted};
    --color-brand:         ${t.color.brand.default};
    --color-brand-hover:   ${t.color.brand.hover};
    --color-brand-subtle:  ${t.color.brand.subtle};
    --color-text-primary:  ${t.color.text.primary};
    --color-text-secondary:${t.color.text.secondary};
    --color-text-tertiary: ${t.color.text.tertiary};
    --color-text-inverse:  ${t.color.text.inverse};
    --color-border:        ${t.color.border.default};
    --color-border-brand:  ${t.color.border.brand};
    --font-display:        ${t.typography.fontFamily.display};
    --font-body:           ${t.typography.fontFamily.body};
  `.trim();
}
