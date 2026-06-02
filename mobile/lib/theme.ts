// Design tokens — "Warm Editorial Soft" system
// Source of truth: design_handoff_awesomecloset/README.md
import { type TextStyle } from 'react-native';

export type AccentKey = 'clay' | 'sage' | 'mono' | 'plum';
export type PaperKey = 'warm' | 'neutral' | 'bright';
export type CornersKey = 'soft' | 'medium' | 'sharp';

export interface ThemeConfig {
  accent: AccentKey;
  paper: PaperKey;
  corners: CornersKey;
  serifHeads: boolean;
}

export const DEFAULT_THEME: ThemeConfig = {
  accent: 'clay',
  paper: 'neutral',
  corners: 'soft',
  serifHeads: true,
};

// Fixed system colors — invariant across all theme variants
export const SYSTEM = {
  ink: '#1E1B16',
  ink2: '#574F44',
  sub: 'rgba(30,27,22,0.52)',
  faint: 'rgba(30,27,22,0.36)',
  line: 'rgba(30,27,22,0.10)',
  sage: '#5F7E64',
  sageSoft: '#E5EEE6',
  star: '#D9A441',
  danger: '#B4503C',
} as const;

const ACCENTS: Record<AccentKey, { accent: string; accentSoft: string }> = {
  clay: { accent: '#A2543B', accentSoft: '#F1E2D9' },
  sage: { accent: '#5F7E64', accentSoft: '#E5EEE6' },
  mono: { accent: '#2A2620', accentSoft: '#E9E4DA' },
  plum: { accent: '#7A5A6E', accentSoft: '#EFE3EA' },
};

const PAPERS: Record<PaperKey, { bg: string; bg2: string; surface: string; ground: string }> = {
  warm:    { bg: '#F4EEE4', bg2: '#EDE6D9', surface: '#FCFAF5', ground: '#EAE2D4' },
  neutral: { bg: '#F3F2EF', bg2: '#EAE9E4', surface: '#FFFFFF', ground: '#ECEAE4' },
  bright:  { bg: '#FAF9F6', bg2: '#F1F0EC', surface: '#FFFFFF', ground: '#F0EEE9' },
};

const CORNERS: Record<CornersKey, { r: number; rsm: number }> = {
  soft:   { r: 24, rsm: 16 },
  medium: { r: 16, rsm: 12 },
  sharp:  { r: 8,  rsm: 6 },
};

export interface Theme {
  // paper
  bg: string;
  bg2: string;
  surface: string;
  ground: string;
  // accent
  accent: string;
  accentSoft: string;
  // system (fixed)
  ink: string;
  ink2: string;
  sub: string;
  faint: string;
  line: string;
  sage: string;
  sageSoft: string;
  star: string;
  danger: string;
  // radii
  r: number;
  rsm: number;
  // shadows (as elevation + shadow props for RN)
  shadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  shadowLg: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  // fonts
  serif: string;
  sans: string;
}

export function buildTheme(cfg: ThemeConfig = DEFAULT_THEME): Theme {
  const a = ACCENTS[cfg.accent];
  const p = PAPERS[cfg.paper];
  const c = CORNERS[cfg.corners];

  return {
    ...p,
    ...a,
    ...SYSTEM,
    ...c,
    shadow: {
      shadowColor: '#3C2D1C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    shadowLg: {
      shadowColor: '#3C2D1C',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.14,
      shadowRadius: 24,
      elevation: 8,
    },
    serif: cfg.serifHeads ? 'PlayfairDisplay_700Bold' : 'BeVietnamPro_400Regular',
    sans: 'BeVietnamPro_400Regular',
  };
}

export const T = buildTheme(DEFAULT_THEME);

// ---------------------------------------------------------------------------
// SP — Spacing scale (4pt grid)
// sp(4) = 16, sp(6) = 24, etc. sp7/sp8 jump to 32/40 per design spec.
// ---------------------------------------------------------------------------
const SP_SCALE = [0, 4, 8, 12, 16, 20, 24, 32, 40] as const;
export type SpStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export function sp(step: SpStep): number {
  return SP_SCALE[step];
}

// ---------------------------------------------------------------------------
// FS — Font size scale (size + line-height pairs)
// ---------------------------------------------------------------------------
export const FS = {
  caption: { size: 11,   lh: 16 },
  sm:      { size: 12.5, lh: 18 },
  body:    { size: 14,   lh: 20 },
  md:      { size: 15.5, lh: 22 },
  label:   { size: 16,   lh: 22 },
  h3:      { size: 20,   lh: 26 },
  h2:      { size: 25,   lh: 30 },
  h1:      { size: 28,   lh: 32 },
  title:   { size: 34,   lh: 38 },
  display: { size: 40,   lh: 42 },
  hero:    { size: 44,   lh: 46 },
  numeric: { size: 56,   lh: 56 },
} as const;

// ---------------------------------------------------------------------------
// RADIUS — fixed values not covered by theme corners
// ---------------------------------------------------------------------------
export const RADIUS = {
  pill:  999,
  field: 14,
} as const;

// ---------------------------------------------------------------------------
// TXT — Named text styles
// Loaded fonts: PlayfairDisplay_700Bold/Italic, BeVietnamPro_400/600/700.
// No 500/600 Playfair variant loaded → all serif styles use 700Bold.
// Italic variants are spread-overrides: <Text style={[TXT.h1, TXT.h1Italic]}>
// ---------------------------------------------------------------------------
const _SERIF      = 'PlayfairDisplay_700Bold';
const _SERIF_I    = 'PlayfairDisplay_700Bold_Italic';
const _SANS       = 'BeVietnamPro_400Regular';
const _SANS_SEMI  = 'BeVietnamPro_600SemiBold';

export const TXT = {
  hero:         { fontFamily: _SERIF,     fontSize: FS.hero.size,    lineHeight: FS.hero.lh,    letterSpacing: -0.8 } as TextStyle,
  heroItalic:   { fontFamily: _SERIF_I,   fontSize: FS.hero.size,    lineHeight: FS.hero.lh,    letterSpacing: -0.8 } as TextStyle,
  display:      { fontFamily: _SERIF,     fontSize: FS.display.size, lineHeight: FS.display.lh, letterSpacing: -0.5 } as TextStyle,
  displayItalic:{ fontFamily: _SERIF_I,   fontSize: FS.display.size, lineHeight: FS.display.lh, letterSpacing: -0.5 } as TextStyle,
  title:        { fontFamily: _SERIF,     fontSize: FS.title.size,   lineHeight: FS.title.lh,   letterSpacing: -0.5 } as TextStyle,
  titleItalic:  { fontFamily: _SERIF_I,   fontSize: FS.title.size,   lineHeight: FS.title.lh,   letterSpacing: -0.5 } as TextStyle,
  h1:           { fontFamily: _SERIF,     fontSize: FS.h1.size,      lineHeight: FS.h1.lh,      letterSpacing: -0.3 } as TextStyle,
  h1Italic:     { fontFamily: _SERIF_I,   fontSize: FS.h1.size,      lineHeight: FS.h1.lh,      letterSpacing: -0.3 } as TextStyle,
  h2:           { fontFamily: _SERIF,     fontSize: FS.h2.size,      lineHeight: FS.h2.lh,      letterSpacing: -0.2 } as TextStyle,
  h3:           { fontFamily: _SERIF,     fontSize: FS.h3.size,      lineHeight: FS.h3.lh,      letterSpacing:  0   } as TextStyle,
  numeric:      { fontFamily: _SERIF,     fontSize: FS.numeric.size, lineHeight: FS.numeric.lh, letterSpacing: -1.5 } as TextStyle,
  body:         { fontFamily: _SANS,      fontSize: FS.body.size,    lineHeight: FS.body.lh,    letterSpacing:  0   } as TextStyle,
  bodyStrong:   { fontFamily: _SANS_SEMI, fontSize: FS.body.size,    lineHeight: FS.body.lh,    letterSpacing:  0   } as TextStyle,
  md:           { fontFamily: _SANS,      fontSize: FS.md.size,      lineHeight: FS.md.lh,      letterSpacing:  0   } as TextStyle,
  label:        { fontFamily: _SANS_SEMI, fontSize: FS.label.size,   lineHeight: FS.label.lh,   letterSpacing:  0.2 } as TextStyle,
  button:       { fontFamily: _SERIF,     fontSize: FS.label.size,   lineHeight: FS.label.lh,   letterSpacing:  0.2 } as TextStyle,
  caption:      { fontFamily: _SANS,      fontSize: FS.sm.size,      lineHeight: FS.sm.lh,      letterSpacing:  0   } as TextStyle,
  kicker:       { fontFamily: _SANS_SEMI, fontSize: FS.caption.size, lineHeight: FS.caption.lh, letterSpacing:  2, textTransform: 'uppercase' } as TextStyle,
} as const;
