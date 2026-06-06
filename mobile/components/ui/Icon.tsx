import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

// SVG paths ported from design_handoff_awesomecloset/app-core.jsx
const PATHS: Record<string, string> = {
  back: 'M15 5l-7 7 7 7',
  chevron: 'M9 6l6 6-6 6',
  chevronD: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  search: 'M11 4a7 7 0 105 12l4 4',
  check: 'M5 12l5 5 9-11',
  heart: 'M12 20s-7-4.6-9.3-9C1 7.8 3 4.5 6.4 4.5 9 4.5 12 7.5 12 7.5s3-3 5.6-3C21 4.5 23 7.8 21.3 11 19 15.4 12 20 12 20z',
  camera: 'M4 8h3l1.5-2h7L17 8h3v11H4zM12 16a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  gallery: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  home: 'M3 10.5 12 3l9 7.5M5 9v11h14V9',
  closet: 'M5 4h14v16H5zM5 9h14M11 9v11',
  chart: 'M5 19V9M12 19V5M19 19v-7',
  retry: 'M4 12a8 8 0 108-8M4 12V6M4 12h6',
  edit: 'M5 19l-1 1 1-4L16 5l3 3L8 19zM14 7l3 3',
  star: 'M12 3l2.6 6.3L21 10l-5 4.3L17.5 21 12 17.3 6.5 21 8 14.3 3 10l6.4-.7z',
  wear: 'M7 4l5 3 5-3 3 5-3 2v9H7v-9L4 9z',
  dislike: 'M17 14v-9H20v9zM17 14l-4 7c-2 0-3-1-3-3l.5-4H4l2-8h7l4 2',
  filter: 'M4 6h16M7 12h10M10 18h4',
  loc: 'M12 21s-6-5.3-6-10a6 6 0 1112 0c0 4.7-6 10-6 10zM12 9a2 2 0 100 4 2 2 0 000-4z',
  bell: 'M6 16V10a6 6 0 1112 0v6l2 2H4zM10 21h4',
  lock: 'M6 10V8a6 6 0 1112 0v2M5 10h14v10H5z',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  archive: 'M4 5h16v4H4zM5 9h14v10H5zM9 13h6',
  trash: 'M5 7h14M10 7V4h4v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
  sun: 'M12 4v2M12 18v2M4 12h2M18 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0',
  bookmark: 'M6 4h12v17l-6-4-6 4z',
  shield: 'M12 3l8 3v6c0 4.4-3.4 7.6-8 9-4.6-1.4-8-4.6-8-9V6z',
  help: 'M9.2 9a3 3 0 114.3 2.7c-1 .5-1.5 1.2-1.5 2.3M12 17.5h.01',
  logout: 'M14 8V6a2 2 0 00-2-2H5v16h7a2 2 0 002-2v-2M9 12h12M18 9l3 3-3 3',
  palette: 'M12 3c4.5 5.5 7 8.8 7 12a7 7 0 01-14 0c0-3.2 2.5-6.5 7-12z',
  moon: 'M20 14a8 8 0 11-9-11 6.5 6.5 0 009 11z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  download: 'M12 4v10M8 11l4 4 4-4M5 19h14',
  share: 'M16 6l-4-4-4 4M12 2v13M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7',
  eyeOff: 'M3 3l18 18M10.6 10.7a3 3 0 004 4M6.5 6.6C4 8.2 2 12 2 12s4 7 10 7a9 9 0 004.5-1.2M9.9 5.2A9.6 9.6 0 0112 5c6 0 10 7 10 7a18 18 0 01-2.4 3.2',
};

export type IconName = keyof typeof PATHS;

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
}

export function Icon({ name, size = 22, color = '#1E1B16', strokeWidth = 1.8, filled = false }: Props) {
  const d = PATHS[name] ?? '';

  if (name === 'sun') {
    const linePaths = d.split('M').filter(Boolean).map((s) => `M${s}`);
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="4.5" fill={color} />
        <G stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
          {linePaths.map((p, i) => (
            <Path key={i} d={p} />
          ))}
        </G>
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={d}
        fill={filled ? color : 'none'}
        stroke={filled ? 'none' : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
