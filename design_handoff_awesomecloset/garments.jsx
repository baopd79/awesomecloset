// garments.jsx — flat-lay clothing illustrations + Vietnamese mock data
// Exports (to window): Garment, CLOSET, OUTFITS, garmentLabel
// Each <Garment kind color accent /> renders a clean flat-lay silhouette
// on a transparent ground, in a consistent illustration language:
//   solid color fill + soft seam/detail lines (semi-transparent ink)
//   so it reads as a "removed-background" product photo.

const INK = 'rgba(0,0,0,0.16)';   // seam / detail lines
const INK2 = 'rgba(0,0,0,0.28)';  // stronger detail
const HI = 'rgba(255,255,255,0.5)';

function GShape({ children, vb = '0 0 200 240' }) {
  return (
    <svg viewBox={vb} width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
      {children}
    </svg>
  );
}

// ── individual garments ─────────────────────────────────────────────
const SHAPES = {
  tee: (c) => (
    <GShape>
      <path d="M74,60 L40,74 L24,104 L50,120 L46,116 L52,206 Q53,214 61,214 L139,214 Q147,214 148,206 L154,116 L150,120 L176,104 L160,74 L126,60 Q100,82 74,60 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M74,60 Q100,82 126,60" fill="none" stroke={INK2} strokeWidth="2"/>
      <path d="M50,120 L52,128 M150,120 L148,128" stroke={INK} strokeWidth="1.5"/>
    </GShape>
  ),
  shirt: (c) => (
    <GShape>
      <path d="M72,58 L42,72 L28,102 L50,118 L52,210 Q52,216 58,216 L142,216 Q148,216 148,210 L150,118 L172,102 L158,72 L128,58 L114,70 L100,82 L86,70 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M86,70 L96,210 M114,70 L104,210" stroke={INK} strokeWidth="1.4"/>
      <path d="M72,58 L86,70 M128,58 L114,70" stroke={INK2} strokeWidth="2"/>
      <circle cx="100" cy="110" r="2" fill={INK2}/><circle cx="100" cy="140" r="2" fill={INK2}/><circle cx="100" cy="170" r="2" fill={INK2}/>
    </GShape>
  ),
  hoodie: (c) => (
    <GShape>
      <path d="M70,58 Q100,40 130,58 L162,74 L178,108 L150,124 L152,210 Q152,216 146,216 L54,216 Q48,216 48,210 L50,124 L22,108 L38,74 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M70,58 Q100,86 130,58 Q120,72 100,72 Q80,72 70,58 Z" fill={INK} stroke="none"/>
      <path d="M84,150 L84,176 Q84,184 92,184 L108,184 Q116,184 116,176 L116,150" fill="none" stroke={INK} strokeWidth="1.5"/>
      <line x1="92" y1="92" x2="92" y2="118" stroke={INK2} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="108" y1="92" x2="108" y2="118" stroke={INK2} strokeWidth="2.5" strokeLinecap="round"/>
    </GShape>
  ),
  sweater: (c) => (
    <GShape>
      <path d="M72,62 L40,76 L26,108 L50,122 L52,206 Q52,214 60,214 L140,214 Q148,214 148,206 L150,122 L174,108 L160,76 L128,62 Q100,76 72,62 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M72,62 Q100,78 128,62 Q116,72 100,72 Q84,72 72,62 Z" fill={INK} stroke="none"/>
      <path d="M52,206 L148,206 M50,122 L54,122 M146,122 L150,122" stroke={INK} strokeWidth="1.4"/>
      <path d="M62,90 L80,108 M138,90 L120,108" stroke={INK} strokeWidth="1.2" opacity="0.7"/>
    </GShape>
  ),
  jacket: (c) => (
    <GShape>
      <path d="M70,56 L40,70 L26,104 L48,120 L50,212 Q50,216 56,216 L98,216 L98,80 L70,56 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M130,56 L160,70 L174,104 L152,120 L150,212 Q150,216 144,216 L102,216 L102,80 L130,56 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M70,56 L98,80 L100,96 L78,74 Z" fill={INK} stroke="none"/>
      <path d="M130,56 L102,80 L100,96 L122,74 Z" fill={INK} stroke="none"/>
      <circle cx="96" cy="120" r="1.8" fill={INK2}/><circle cx="96" cy="150" r="1.8" fill={INK2}/><circle cx="96" cy="180" r="1.8" fill={INK2}/>
    </GShape>
  ),
  coat: (c) => (
    <GShape>
      <path d="M68,54 L36,70 L24,118 L46,126 L48,220 Q48,224 54,224 L146,224 Q152,224 152,220 L154,126 L176,118 L164,70 L132,54 L114,66 L100,76 L86,66 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M86,66 L100,76 L100,224 M86,66 L96,80 L96,224" stroke={INK} strokeWidth="1.4" fill="none"/>
      <path d="M68,54 L86,66 M132,54 L114,66" stroke={INK2} strokeWidth="2"/>
      <line x1="60" y1="150" x2="78" y2="150" stroke={INK} strokeWidth="2"/>
      <circle cx="104" cy="120" r="2" fill={INK2}/><circle cx="104" cy="155" r="2" fill={INK2}/><circle cx="104" cy="190" r="2" fill={INK2}/>
    </GShape>
  ),
  pants: (c) => (
    <GShape>
      <path d="M64,30 L136,30 L142,40 L138,210 Q138,216 132,216 L112,216 Q106,216 106,210 L100,96 L94,210 Q94,216 88,216 L68,216 Q62,216 62,210 L58,40 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M64,30 L136,30 L134,44 L66,44 Z" fill={INK} stroke="none"/>
      <line x1="100" y1="50" x2="100" y2="96" stroke={INK} strokeWidth="1.4"/>
      <path d="M70,60 L82,60 M118,60 L130,60" stroke={INK} strokeWidth="1.4"/>
    </GShape>
  ),
  jeans: (c) => (
    <GShape>
      <path d="M64,30 L136,30 L142,40 L138,210 Q138,216 132,216 L112,216 Q106,216 106,210 L100,96 L94,210 Q94,216 88,216 L68,216 Q62,216 62,210 L58,40 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M64,30 L136,30 L134,44 L66,44 Z" fill={INK} stroke="none"/>
      <line x1="100" y1="50" x2="100" y2="96" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeDasharray="3 3"/>
      <path d="M70,52 L88,52 L86,76 L72,76 Z" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2"/>
      <path d="M114,52 L130,52 L128,76 L116,76 Z" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2"/>
    </GShape>
  ),
  shorts: (c) => (
    <GShape vb="0 0 200 180">
      <path d="M58,34 L142,34 L148,44 L142,140 Q142,146 136,146 L114,146 Q108,146 108,140 L100,90 L92,140 Q92,146 86,146 L64,146 Q58,146 58,140 L52,44 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M58,34 L142,34 L140,48 L60,48 Z" fill={INK} stroke="none"/>
      <line x1="100" y1="54" x2="100" y2="90" stroke={INK} strokeWidth="1.4"/>
    </GShape>
  ),
  skirt: (c) => (
    <GShape vb="0 0 200 200">
      <path d="M64,40 L136,40 L138,54 L170,170 Q172,178 162,178 L38,178 Q28,178 30,170 L62,54 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M64,40 L136,40 L138,56 L62,56 Z" fill={INK} stroke="none"/>
      <path d="M88,58 L74,176 M112,58 L126,176 M100,58 L100,176" stroke={INK} strokeWidth="1.2" opacity="0.7"/>
    </GShape>
  ),
  dress: (c) => (
    <GShape>
      <path d="M74,46 L58,58 L44,84 L62,96 L58,120 L42,210 Q40,218 50,218 L150,218 Q160,218 158,210 L142,120 L138,96 L156,84 L142,58 L126,46 Q100,64 74,46 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M74,46 Q100,64 126,46" fill="none" stroke={INK2} strokeWidth="2"/>
      <path d="M62,96 L138,96" stroke={INK} strokeWidth="1.4"/>
      <path d="M80,120 L74,210 M120,120 L126,210 M100,108 L100,210" stroke={INK} strokeWidth="1.1" opacity="0.6"/>
    </GShape>
  ),
  sneakers: (c, a) => (
    <GShape vb="0 0 220 140">
      <path d="M30,70 Q34,52 52,52 L78,52 L120,82 L176,90 Q196,94 196,110 L196,118 Q196,124 190,124 L40,124 Q26,124 24,110 L22,86 Q22,72 30,70 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M24,116 L196,116 L196,122 Q196,124 190,124 L40,124 Q26,124 24,116 Z" fill={a || 'rgba(255,255,255,0.85)'} stroke={INK} strokeWidth="1"/>
      <path d="M78,52 L96,78 M92,60 L108,80 M104,66 L120,82" stroke={INK} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M52,52 Q58,86 56,116" stroke={INK} strokeWidth="1.2" fill="none" opacity="0.6"/>
    </GShape>
  ),
  boots: (c) => (
    <GShape vb="0 0 200 200">
      <path d="M70,28 L118,28 Q124,28 124,34 L122,120 L168,140 Q178,144 178,154 L178,168 Q178,174 172,174 L74,174 Q66,174 66,166 L66,40 Q66,28 70,28 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M66,166 L178,166 L178,170 Q178,174 172,174 L74,174 Q66,174 66,166 Z" fill={INK} stroke="none"/>
      <path d="M124,120 L122,90 M66,60 L122,60" stroke={INK} strokeWidth="1.2" opacity="0.6"/>
    </GShape>
  ),
  bag: (c, a) => (
    <GShape vb="0 0 200 200">
      <path d="M70,52 Q70,24 100,24 Q130,24 130,52" fill="none" stroke={a || INK2} strokeWidth="6" strokeLinecap="round"/>
      <path d="M48,52 L152,52 Q158,52 159,58 L172,168 Q173,176 165,176 L35,176 Q27,176 28,168 L41,58 Q42,52 48,52 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <line x1="34" y1="88" x2="166" y2="88" stroke={INK} strokeWidth="1.2" opacity="0.6"/>
    </GShape>
  ),
  cap: (c) => (
    <GShape vb="0 0 200 140">
      <path d="M48,92 Q44,44 100,44 Q156,44 152,92 Q152,98 146,98 L54,98 Q48,98 48,92 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M146,98 L184,108 Q192,110 190,116 L188,118 Q146,108 100,108 L100,98 Z" fill={c} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M100,46 L100,98 M76,50 Q80,72 76,96 M124,50 Q120,72 124,96" stroke={INK} strokeWidth="1.2" fill="none" opacity="0.6"/>
      <circle cx="100" cy="50" r="4" fill={INK2}/>
    </GShape>
  ),
  glasses: (c) => (
    <GShape vb="0 0 220 100">
      <rect x="22" y="32" width="68" height="48" rx="16" fill="none" stroke={c} strokeWidth="7"/>
      <rect x="130" y="32" width="68" height="48" rx="16" fill="none" stroke={c} strokeWidth="7"/>
      <path d="M90,50 Q110,40 130,50" fill="none" stroke={c} strokeWidth="7" strokeLinecap="round"/>
      <path d="M22,46 L8,40 M198,46 L212,40" stroke={c} strokeWidth="7" strokeLinecap="round"/>
    </GShape>
  ),
};

function Garment({ kind = 'tee', color = '#c9c2b8', accent }) {
  const render = SHAPES[kind] || SHAPES.tee;
  return render(color, accent);
}

// ── Vietnamese labels per type ──────────────────────────────────────
const TYPE_LABEL = {
  tee: 'Áo thun', shirt: 'Sơ mi', hoodie: 'Hoodie', sweater: 'Áo len',
  jacket: 'Áo khoác', coat: 'Áo dạ', pants: 'Quần tây', jeans: 'Quần jeans',
  shorts: 'Quần short', skirt: 'Chân váy', dress: 'Đầm', sneakers: 'Sneakers',
  boots: 'Boots', bag: 'Túi', cap: 'Mũ', glasses: 'Kính',
};
function garmentLabel(kind) { return TYPE_LABEL[kind] || kind; }

// ── Closet mock data (Vietnam context) ──────────────────────────────
// color = garment fill; bg = the soft card tint behind it
const CLOSET = [
  { id: 1,  kind: 'tee',     color: '#e7e3da', name: 'Áo thun trắng kem',   type: 'Áo thun', occ: 'Đi học',  style: 'Tối giản',  worn: 12 },
  { id: 2,  kind: 'shirt',   color: '#7d97b5', name: 'Sơ mi xanh nhạt',     type: 'Sơ mi',   occ: 'Đi làm',  style: 'Công sở',  worn: 8 },
  { id: 3,  kind: 'jeans',   color: '#5b6b85', name: 'Quần jeans xanh',     type: 'Quần jeans', occ: 'Đi chơi', style: 'Casual', worn: 20 },
  { id: 4,  kind: 'hoodie',  color: '#b8b0c4', name: 'Hoodie tím khói',     type: 'Hoodie',  occ: 'Đi chơi', style: 'Streetwear', worn: 5 },
  { id: 5,  kind: 'dress',   color: '#c98b86', name: 'Đầm hồng đất',        type: 'Đầm',     occ: 'Hẹn hò',  style: 'Nữ tính',  worn: 3 },
  { id: 6,  kind: 'sneakers',color: '#ece8e1', accent: '#d8d2c6', name: 'Sneakers trắng', type: 'Sneakers', occ: 'Đi học', style: 'Casual', worn: 25 },
  { id: 7,  kind: 'jacket',  color: '#3f4a40', name: 'Blazer xanh rêu',     type: 'Áo khoác', occ: 'Đi làm', style: 'Công sở', worn: 6 },
  { id: 8,  kind: 'pants',   color: '#3a3a3c', name: 'Quần tây đen',        type: 'Quần tây', occ: 'Đi làm', style: 'Công sở', worn: 14 },
  { id: 9,  kind: 'tee',     color: '#9aa68f', name: 'Áo thun rêu',         type: 'Áo thun', occ: 'Đi chơi', style: 'Casual', worn: 9 },
  { id: 10, kind: 'skirt',   color: '#cbbfa6', name: 'Chân váy be',         type: 'Chân váy', occ: 'Hẹn hò', style: 'Nữ tính', worn: 4 },
  { id: 11, kind: 'sweater', color: '#c2a98f', name: 'Áo len nâu sữa',      type: 'Áo len',  occ: 'Đi học',  style: 'Tối giản', worn: 7 },
  { id: 12, kind: 'bag',     color: '#8a6f57', accent: '#6f5946', name: 'Túi tote nâu', type: 'Túi', occ: 'Đi làm', style: 'Tối giản', worn: 18 },
  { id: 13, kind: 'shorts',  color: '#bcae93', name: 'Quần short kaki',     type: 'Quần short', occ: 'Đi chơi', style: 'Casual', worn: 11 },
  { id: 14, kind: 'cap',     color: '#2f3a44', name: 'Mũ lưỡi trai navy',   type: 'Mũ',      occ: 'Đi chơi', style: 'Streetwear', worn: 2 },
  { id: 15, kind: 'boots',   color: '#4a3b30', name: 'Boots da nâu',        type: 'Boots',   occ: 'Hẹn hò',  style: 'Cá tính', worn: 0 },
  { id: 16, kind: 'coat',    color: '#9a9387', name: 'Áo dạ xám be',        type: 'Áo dạ',   occ: 'Đi làm',  style: 'Tối giản', worn: 1 },
];

// ── Outfit suggestions (today) ──────────────────────────────────────
const OUTFITS = [
  {
    id: 'o1', name: 'Đi làm nhẹ nhàng', occ: 'Đi làm',
    reason: 'Trời 24°C se mát — sơ mi xanh phối quần tây vừa lịch sự vừa thoáng cho buổi sáng.',
    items: [2, 8, 6, 12],
  },
  {
    id: 'o2', name: 'Cà phê cuối tuần', occ: 'Đi chơi',
    reason: 'Hôm nay nắng nhẹ, hoodie tím phối jeans tạo cảm giác trẻ trung mà thoải mái đi cà phê.',
    items: [4, 3, 6, 14],
  },
  {
    id: 'o3', name: 'Hẹn hò buổi tối', occ: 'Hẹn hò',
    reason: 'Đầm hồng đất phối boots da nâu — ấm áp, nữ tính cho buổi tối 22°C.',
    items: [5, 15, 12],
  },
];

Object.assign(window, { Garment, CLOSET, OUTFITS, garmentLabel });
