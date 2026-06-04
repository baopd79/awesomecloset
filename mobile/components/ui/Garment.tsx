import { Circle, Line, Path, Svg } from 'react-native-svg';

// Flat-lay clothing silhouettes ported from design_handoff_awesomecloset/garments.jsx.
// Solid fill + soft semi-transparent seam lines so each reads as a removed-background
// product photo. Only the kinds used by the onboarding heroes are ported.
const INK = 'rgba(0,0,0,0.16)'; // seam / detail lines
const INK2 = 'rgba(0,0,0,0.28)'; // stronger detail

export type GarmentKind = 'tee' | 'shirt' | 'pants' | 'jeans' | 'sneakers' | 'bag';

interface Props {
  kind: GarmentKind;
  color?: string;
  accent?: string;
  size?: number;
}

export function Garment({ kind, color = '#c9c2b8', accent, size = 92 }: Props) {
  switch (kind) {
    case 'shirt':
      return (
        <Svg width={size} height={size} viewBox="0 0 200 240">
          <Path
            d="M72,58 L42,72 L28,102 L50,118 L52,210 Q52,216 58,216 L142,216 Q148,216 148,210 L150,118 L172,102 L158,72 L128,58 L114,70 L100,82 L86,70 Z"
            fill={color}
            stroke={INK}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <Path d="M86,70 L96,210 M114,70 L104,210" stroke={INK} strokeWidth={1.4} fill="none" />
          <Path d="M72,58 L86,70 M128,58 L114,70" stroke={INK2} strokeWidth={2} fill="none" />
          <Circle cx={100} cy={110} r={2} fill={INK2} />
          <Circle cx={100} cy={140} r={2} fill={INK2} />
          <Circle cx={100} cy={170} r={2} fill={INK2} />
        </Svg>
      );
    case 'pants':
      return (
        <Svg width={size} height={size} viewBox="0 0 200 240">
          <Path
            d="M64,30 L136,30 L142,40 L138,210 Q138,216 132,216 L112,216 Q106,216 106,210 L100,96 L94,210 Q94,216 88,216 L68,216 Q62,216 62,210 L58,40 Z"
            fill={color}
            stroke={INK}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <Path d="M64,30 L136,30 L134,44 L66,44 Z" fill={INK} stroke="none" />
          <Line x1={100} y1={50} x2={100} y2={96} stroke={INK} strokeWidth={1.4} />
          <Path d="M70,60 L82,60 M118,60 L130,60" stroke={INK} strokeWidth={1.4} fill="none" />
        </Svg>
      );
    case 'jeans':
      return (
        <Svg width={size} height={size} viewBox="0 0 200 240">
          <Path
            d="M64,30 L136,30 L142,40 L138,210 Q138,216 132,216 L112,216 Q106,216 106,210 L100,96 L94,210 Q94,216 88,216 L68,216 Q62,216 62,210 L58,40 Z"
            fill={color}
            stroke={INK}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <Path d="M64,30 L136,30 L134,44 L66,44 Z" fill={INK} stroke="none" />
          <Line
            x1={100}
            y1={50}
            x2={100}
            y2={96}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={1.4}
            strokeDasharray="3 3"
          />
          <Path
            d="M70,52 L88,52 L86,76 L72,76 Z"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={1.2}
          />
          <Path
            d="M114,52 L130,52 L128,76 L116,76 Z"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={1.2}
          />
        </Svg>
      );
    case 'sneakers':
      return (
        <Svg width={size} height={size * 0.64} viewBox="0 0 220 140">
          <Path
            d="M30,70 Q34,52 52,52 L78,52 L120,82 L176,90 Q196,94 196,110 L196,118 Q196,124 190,124 L40,124 Q26,124 24,110 L22,86 Q22,72 30,70 Z"
            fill={color}
            stroke={INK}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <Path
            d="M24,116 L196,116 L196,122 Q196,124 190,124 L40,124 Q26,124 24,116 Z"
            fill={accent || 'rgba(255,255,255,0.85)'}
            stroke={INK}
            strokeWidth={1}
          />
          <Path
            d="M78,52 L96,78 M92,60 L108,80 M104,66 L120,82"
            stroke={INK}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M52,52 Q58,86 56,116"
            stroke={INK}
            strokeWidth={1.2}
            fill="none"
            opacity={0.6}
          />
        </Svg>
      );
    case 'bag':
      return (
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Path
            d="M70,52 Q70,24 100,24 Q130,24 130,52"
            fill="none"
            stroke={accent || INK2}
            strokeWidth={6}
            strokeLinecap="round"
          />
          <Path
            d="M48,52 L152,52 Q158,52 159,58 L172,168 Q173,176 165,176 L35,176 Q27,176 28,168 L41,58 Q42,52 48,52 Z"
            fill={color}
            stroke={INK}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <Line x1={34} y1={88} x2={166} y2={88} stroke={INK} strokeWidth={1.2} opacity={0.6} />
        </Svg>
      );
    case 'tee':
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 200 240">
          <Path
            d="M74,60 L40,74 L24,104 L50,120 L46,116 L52,206 Q53,214 61,214 L139,214 Q147,214 148,206 L154,116 L150,120 L176,104 L160,74 L126,60 Q100,82 74,60 Z"
            fill={color}
            stroke={INK}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <Path d="M74,60 Q100,82 126,60" fill="none" stroke={INK2} strokeWidth={2} />
          <Path d="M50,120 L52,128 M150,120 L148,128" stroke={INK} strokeWidth={1.5} fill="none" />
        </Svg>
      );
  }
}
