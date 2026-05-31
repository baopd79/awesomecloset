// app-extras.jsx — shared Collage + analytics-derived data
// Depends on CLOSET/OUTFITS (garments.jsx) and TOK (app-core.jsx)
// Exports (window): Collage, COLOR_STATS, UNWORN, MONTH_DAYS, OCCASION_OPTS, WEATHER

function itemsOf(ids) { return ids.map(id => CLOSET.find(c => c.id === id)).filter(Boolean); }

// Soft editorial flat-lay collage on a tinted ground
function Collage({ ids, height = 200, ground, radius, pad = 14 }) {
  const items = itemsOf(ids).slice(0, 4);
  const cols = items.length <= 2 ? items.length : 2;
  const rows = Math.ceil(items.length / cols);
  return (
    <div style={{
      height, background: ground || TOK.ground, borderRadius: radius != null ? radius : 'var(--radius)',
      display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`,
      gap: 8, padding: pad, overflow: 'hidden',
    }}>
      {items.map((it, i) => (
        <div key={it.id} style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10,
          minHeight: 0, minWidth: 0,
          gridColumn: (items.length === 3 && i === 0) ? 'span 2' : 'auto',
        }}>
          <Garment kind={it.kind} color={it.color} accent={it.accent} />
        </div>
      ))}
    </div>
  );
}

// Color breakdown (aggregate closet colors into named families)
const COLOR_STATS = [
  { name: 'Trung tính (be, kem)', hex: '#CBBFA6', count: 14 },
  { name: 'Xanh navy & jeans',    hex: '#5B6B85', count: 9 },
  { name: 'Đen & xám',            hex: '#3A3A3C', count: 8 },
  { name: 'Nâu đất',              hex: '#8A6F57', count: 6 },
  { name: 'Xanh rêu',             hex: '#7A8A6A', count: 5 },
  { name: 'Hồng & nâu hồng',      hex: '#C98B86', count: 3 },
];

const UNWORN = CLOSET.filter(c => c.worn === 0);

// Month calendar: 31 days, some with an outfit worn (occasion-tinted)
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => {
  const d = i + 1;
  const map = { 3: 'Đi học', 5: 'Đi làm', 8: 'Đi chơi', 9: 'Đi làm', 12: 'Hẹn hò', 15: 'Đi làm', 16: 'Đi học', 19: 'Đi chơi', 22: 'Đi làm', 23: 'Đi làm', 25: 'Hẹn hò', 26: 'Đi chơi', 29: 'Đi làm', 30: 'Đi học', 31: 'Đi chơi' };
  return { day: d, occ: map[d] || null };
});

const OCC_COLOR = { 'Đi học': '#7A8A6A', 'Đi làm': '#5B6B85', 'Đi chơi': '#A2543B', 'Hẹn hò': '#C98B86' };

const OCCASION_OPTS = [
  { key: 'Đi học', emoji: '🎒', note: 'Lớp học, thư viện' },
  { key: 'Đi làm', emoji: '💼', note: 'Công sở, họp' },
  { key: 'Đi chơi', emoji: '☕', note: 'Cà phê, dạo phố' },
  { key: 'Hẹn hò', emoji: '🌷', note: 'Tối lãng mạn' },
  { key: 'Dự tiệc', emoji: '🥂', note: 'Sự kiện, tiệc' },
  { key: 'Du lịch', emoji: '🧳', note: 'Đi xa, khám phá' },
];

const WEATHER = { temp: 24, hi: 29, lo: 23, cond: 'Trời se mát, nắng nhẹ', city: 'Hồ Chí Minh', rain: 40 };

// ── Taxonomy (khớp enum SPEC) — nhãn tiếng Việt ───────────────────────
const STYLE_OF = {
  tee: ['Casual', 'Tối giản'], shirt: ['Công sở', 'Thanh lịch'], hoodie: ['Streetwear', 'Casual'],
  sweater: ['Tối giản', 'Casual'], jacket: ['Công sở', 'Thanh lịch'], coat: ['Tối giản', 'Thanh lịch'],
  pants: ['Công sở'], jeans: ['Casual', 'Streetwear'], shorts: ['Casual', 'Thể thao'],
  skirt: ['Thanh lịch', 'Nữ tính'], dress: ['Nữ tính', 'Thanh lịch'], sneakers: ['Casual', 'Thể thao'],
  boots: ['Cá tính', 'Thanh lịch'], bag: ['Tối giản'], cap: ['Streetwear', 'Thể thao'], glasses: ['Thanh lịch'],
};
// Nhiều màu mỗi món: [{hex, name, dominant}]
const VN_COLOR = {
  '#e7e3da': 'Trắng kem', '#7d97b5': 'Xanh nhạt', '#5b6b85': 'Xanh denim', '#b8b0c4': 'Tím khói',
  '#c98b86': 'Hồng đất', '#ece8e1': 'Trắng ngà', '#d8d2c6': 'Be nhạt', '#3f4a40': 'Xanh rêu đậm',
  '#3a3a3c': 'Đen than', '#9aa68f': 'Xanh rêu', '#cbbfa6': 'Be cát', '#c2a98f': 'Nâu sữa',
  '#8a6f57': 'Nâu đất', '#6f5946': 'Nâu đậm', '#bcae93': 'Kaki', '#2f3a44': 'Navy', '#4a3b30': 'Nâu da',
  '#9a9387': 'Xám be',
};
function colorsOf(it) {
  const main = { hex: it.color, name: VN_COLOR[it.color] || 'Màu chủ đạo', dominant: true };
  const out = [main];
  if (it.accent && it.accent !== it.color) out.push({ hex: it.accent, name: VN_COLOR[it.accent] || 'Màu phụ', dominant: false });
  return out;
}
function stylesOf(it) { return STYLE_OF[it.kind] || ['Casual']; }
const SEASON_VN = { tee: 'Xuân hè', shorts: 'Xuân hè', dress: 'Xuân hè', skirt: 'Xuân hè', glasses: 'Xuân hè', hoodie: 'Thu đông', sweater: 'Thu đông', jacket: 'Thu đông', coat: 'Thu đông', boots: 'Thu đông' };
function seasonOf(it) { return SEASON_VN[it.kind] || 'Quanh năm'; }

Object.assign(window, { Collage, COLOR_STATS, UNWORN, MONTH_DAYS, OCC_COLOR, OCCASION_OPTS, WEATHER, itemsOf, colorsOf, stylesOf, seasonOf, VN_COLOR });
