// app-core.jsx — "Warm Editorial Soft" system: tokens, primitives, contexts
// Editorial serif + warm paper (Direction A) × soft rounded cards, gentle
// shadows, friendly sage accent (Direction B).
// Exports (window): TOK, buildVars, Icon, Kicker, SoftCard, Pill, PrimaryBtn,
//   GhostBtn, IconBtn, Sheet, Toast, Bar, Stars, NavCtx, StoreCtx, fmtWorn

// ── design tokens (CSS-var backed so Tweaks can retune live) ──────────
const TOK = {
  bg: 'var(--bg)', bg2: 'var(--bg2)', surface: 'var(--surface)',
  ink: 'var(--ink)', ink2: 'var(--ink2)', sub: 'var(--sub)', faint: 'var(--faint)',
  line: 'var(--line)', accent: 'var(--accent)', accentSoft: 'var(--accent-soft)',
  sage: 'var(--sage)', sageSoft: 'var(--sage-soft)', ground: 'var(--ground)',
  shadow: 'var(--shadow)', shadowLg: 'var(--shadow-lg)',
  r: 'var(--radius)', rsm: 'var(--radius-sm)',
  serif: 'var(--serif)', sans: '"Be Vietnam Pro", system-ui, sans-serif',
};

const ACCENTS = {
  clay:  { accent: '#A2543B', soft: '#F1E2D9' },
  sage:  { accent: '#5F7E64', soft: '#E5EEE6' },
  mono:  { accent: '#2A2620', soft: '#E9E4DA' },
  plum:  { accent: '#7A5A6E', soft: '#EFE3EA' },
};
const PAPERS = {
  warm:    { bg: '#F4EEE4', bg2: '#EDE6D9', surface: '#FCFAF5', ground: '#EAE2D4' },
  neutral: { bg: '#F3F2EF', bg2: '#EAE9E4', surface: '#FFFFFF', ground: '#ECEAE4' },
  bright:  { bg: '#FAF9F6', bg2: '#F1F0EC', surface: '#FFFFFF', ground: '#F0EEE9' },
};

function buildVars(t) {
  const accKey = ACCENTS[t.accent] ? t.accent : (Object.keys(ACCENTS).find(k => ACCENTS[k].accent === t.accent) || 'clay');
  const a = ACCENTS[accKey] || ACCENTS.clay;
  const p = PAPERS[t.paper] || PAPERS.warm;
  const rad = { soft: [24, 16], medium: [16, 12], sharp: [8, 6] }[t.corners] || [24, 16];
  return {
    '--bg': p.bg, '--bg2': p.bg2, '--surface': p.surface, '--ground': p.ground,
    '--ink': '#1E1B16', '--ink2': '#574F44', '--sub': 'rgba(30,27,22,0.52)', '--faint': 'rgba(30,27,22,0.36)',
    '--line': 'rgba(30,27,22,0.10)',
    '--accent': a.accent, '--accent-soft': a.soft,
    '--sage': '#5F7E64', '--sage-soft': '#E5EEE6',
    '--shadow': '0 1px 2px rgba(50,38,24,0.05), 0 8px 22px rgba(60,45,28,0.07)',
    '--shadow-lg': '0 2px 6px rgba(50,38,24,0.06), 0 20px 48px rgba(60,45,28,0.14)',
    '--radius': rad[0] + 'px', '--radius-sm': rad[1] + 'px',
    '--serif': t.serifHeads ? '"Playfair Display", serif' : '"Be Vietnam Pro", sans-serif',
  };
}

// ── icon set ──────────────────────────────────────────────────────────
const PATHS = {
  back: 'M15 5l-7 7 7 7', chevron: 'M9 6l6 6-6 6', chevronD: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14', close: 'M6 6l12 12M18 6L6 18',
  search: 'M11 4a7 7 0 105 12l4 4', check: 'M5 12l5 5 9-11',
  heart: 'M12 20s-7-4.6-9.3-9C1 7.8 3 4.5 6.4 4.5 9 4.5 12 7.5 12 7.5s3-3 5.6-3C21 4.5 23 7.8 21.3 11 19 15.4 12 20 12 20z',
  camera: 'M4 8h3l1.5-2h7L17 8h3v11H4zM12 16a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  gallery: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5', spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  home: 'M3 10.5 12 3l9 7.5M5 9v11h14V9', closet: 'M5 4h14v16H5zM5 9h14M11 9v11',
  chart: 'M5 19V9M12 19V5M19 19v-7', retry: 'M4 12a8 8 0 108-8M4 12V6M4 12h6',
  edit: 'M5 19l-1 1 1-4L16 5l3 3L8 19zM14 7l3 3', star: 'M12 3l2.6 6.3L21 10l-5 4.3L17.5 21 12 17.3 6.5 21 8 14.3 3 10l6.4-.7z',
  wear: 'M7 4l5 3 5-3 3 5-3 2v9H7v-9L4 9z', dislike: 'M7 10v9H4v-9zM7 10l4-7c2 0 3 1 3 3l-.5 4H20l-2 8h-7l-4-2',
  filter: 'M4 6h16M7 12h10M10 18h4', loc: 'M12 21s-6-5.3-6-10a6 6 0 1112 0c0 4.7-6 10-6 10zM12 9a2 2 0 100 4 2 2 0 000-4z',
  bell: 'M6 16V10a6 6 0 1112 0v6l2 2H4zM10 21h4', lock: 'M6 10V8a6 6 0 1112 0v2M5 10h14v10H5z',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', archive: 'M4 5h16v4H4zM5 9h14v10H5zM9 13h6',
  sun: 'M12 4v2M12 18v2M4 12h2M18 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0',
  bookmark: 'M6 4h12v17l-6-4-6 4z', shield: 'M12 3l8 3v6c0 4.4-3.4 7.6-8 9-4.6-1.4-8-4.6-8-9V6z',
  help: 'M9.2 9a3 3 0 114.3 2.7c-1 .5-1.5 1.2-1.5 2.3M12 17.5h.01', logout: 'M14 8V6a2 2 0 00-2-2H5v16h7a2 2 0 002-2v-2M9 12h12M18 9l3 3-3 3',
  palette: 'M12 3c4.5 5.5 7 8.8 7 12a7 7 0 01-14 0c0-3.2 2.5-6.5 7-12z', moon: 'M20 14a8 8 0 11-9-11 6.5 6.5 0 009 11z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  download: 'M12 4v10M8 11l4 4 4-4M5 19h14', share: 'M16 6l-4-4-4 4M12 2v13M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7',
  eyeOff: 'M3 3l18 18M10.6 10.7a3 3 0 004 4M6.5 6.6C4 8.2 2 12 2 12s4 7 10 7a9 9 0 004.5-1.2M9.9 5.2A9.6 9.6 0 0112 5c6 0 10 7 10 7a18 18 0 01-2.4 3.2',
};
function Icon({ name, size = 22, color = 'currentColor', sw = 1.8, fill = false }) {
  const d = PATHS[name] || '';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
      {name === 'sun'
        ? <><circle cx="12" cy="12" r="4.5" fill={color}/><g stroke={color} strokeWidth={sw} strokeLinecap="round">{PATHS.sun.split('M').filter(Boolean).map((s,i)=><path key={i} d={'M'+s}/>)}</g></>
        : <path d={d} fill={fill ? color : 'none'} stroke={fill ? 'none' : color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>}
    </svg>
  );
}

// ── primitives ─────────────────────────────────────────────────────────
function Kicker({ children, color, style }) {
  return <div style={{ fontFamily: TOK.sans, fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: color || TOK.faint, ...style }}>{children}</div>;
}

function SoftCard({ children, style, onClick, pad = 0, lg = false }) {
  return (
    <div onClick={onClick} style={{ background: TOK.surface, borderRadius: TOK.r, boxShadow: lg ? TOK.shadowLg : TOK.shadow, padding: pad, overflow: 'hidden', ...style }}>{children}</div>
  );
}

function Pill({ children, active, onClick, soft, style }) {
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
      padding: '8px 15px', borderRadius: 999, fontFamily: TOK.sans, fontSize: 13, fontWeight: 600,
      background: active ? TOK.ink : (soft ? TOK.accentSoft : TOK.surface),
      color: active ? TOK.surface : (soft ? TOK.accent : TOK.sub),
      boxShadow: active ? 'none' : TOK.shadow, transition: 'all .2s', ...style,
    }}>{children}</button>
  );
}

function PrimaryBtn({ children, onClick, style, icon }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      border: 'none', cursor: 'pointer', height: 50, padding: '0 22px', borderRadius: 999,
      background: TOK.ink, color: '#FBF8F2', fontFamily: TOK.serif, fontSize: 16.5, letterSpacing: 0.2,
      boxShadow: '0 6px 18px rgba(30,27,22,0.22)', transition: 'transform .12s', ...style,
    }} onMouseDown={e=>e.currentTarget.style.transform='scale(0.97)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
      {icon && <Icon name={icon} size={18} color="#FBF8F2"/>}{children}
    </button>
  );
}

function GhostBtn({ children, onClick, style, icon, active }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      border: `1.5px solid ${active ? TOK.accent : TOK.line}`, cursor: 'pointer', height: 50, padding: '0 18px',
      borderRadius: 999, background: active ? TOK.accentSoft : 'transparent', color: active ? TOK.accent : TOK.ink,
      fontFamily: TOK.sans, fontSize: 14.5, fontWeight: 600, transition: 'all .15s', ...style,
    }}>{icon && <Icon name={icon} size={18}/>}{children}</button>
  );
}

function IconBtn({ name, onClick, size = 42, iconSize = 20, style, color }) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, flexShrink: 0, borderRadius: 999, border: 'none', cursor: 'pointer',
      background: TOK.surface, boxShadow: TOK.shadow, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style,
    }}><Icon name={name} size={iconSize} color={color || TOK.ink}/></button>
  );
}

function Bar({ value, max = 1, color, h = 8, bg }) {
  return (
    <div style={{ height: h, borderRadius: 999, background: bg || TOK.bg2, overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${Math.min(100, (value / max) * 100)}%`, background: color || TOK.accent, borderRadius: 999, transition: 'width .5s cubic-bezier(.2,.8,.2,1)' }} />
    </div>
  );
}

function Stars({ value = 0, onRate, size = 22 }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onRate && onRate(n)} style={{ border: 'none', background: 'none', cursor: onRate ? 'pointer' : 'default', padding: 0 }}>
          <Icon name="star" size={size} color={n <= value ? '#D9A441' : TOK.line} fill={n <= value}/>
        </button>
      ))}
    </div>
  );
}

// bottom sheet
function Sheet({ open, onClose, children, title }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 200, pointerEvents: open ? 'auto' : 'none' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(30,27,22,0.4)', opacity: open ? 1 : 0, transition: 'opacity .28s' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, background: TOK.surface,
        borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '12px 20px 34px',
        transform: open ? 'translateY(0)' : 'translateY(110%)', transition: 'transform .34s cubic-bezier(.2,.9,.2,1)',
        boxShadow: '0 -10px 40px rgba(30,27,22,0.2)', maxHeight: '84%', overflowY: 'auto',
      }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: TOK.line, margin: '0 auto 14px' }} />
        {title && <div style={{ fontFamily: TOK.serif, fontSize: 22, color: TOK.ink, marginBottom: 14 }}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

function Toast({ msg }) {
  return (
    <div style={{
      position: 'absolute', bottom: 104, left: '50%', transform: `translateX(-50%) translateY(${msg ? 0 : 20}px)`,
      background: TOK.ink, color: '#FBF8F2', padding: '12px 20px', borderRadius: 999, zIndex: 300,
      fontFamily: TOK.sans, fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap',
      opacity: msg ? 1 : 0, transition: 'all .3s', boxShadow: '0 10px 30px rgba(30,27,22,0.3)', pointerEvents: 'none',
    }}>{msg}</div>
  );
}

function fmtWorn(n) { return n > 0 ? `Đã mặc ${n} lần` : 'Chưa mặc lần nào'; }

const NavCtx = React.createContext(null);
const StoreCtx = React.createContext(null);

Object.assign(window, {
  TOK, buildVars, ACCENTS, PAPERS, Icon, Kicker, SoftCard, Pill, PrimaryBtn, GhostBtn,
  IconBtn, Bar, Stars, Sheet, Toast, Stars, fmtWorn, NavCtx, StoreCtx,
});
