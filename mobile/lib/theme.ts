// Design tokens — "Warm Editorial Soft" system
// Source of truth: design_handoff_awesomecloset/README.md

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
