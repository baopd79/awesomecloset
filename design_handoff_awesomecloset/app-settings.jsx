// app-settings.jsx — Archived items + in-app Appearance customization
// Exports (window): ArchiveScreen, AppearanceScreen

// ── Đồ đã lưu trữ ─────────────────────────────────────────────────────
function ArchiveScreen() {
  const nav = React.useContext(NavCtx);
  const store = React.useContext(StoreCtx);
  const items = store.archivedItems;

  return (
    <div style={{ minHeight: '100%', background: TOK.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '54px 16px 8px' }}>
        <IconBtn name="back" onClick={() => nav.goBack()} />
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: TOK.serif, fontSize: 19, color: TOK.ink }}>Đồ đã lưu trữ</span>
        <div style={{ width: 42 }} />
      </div>

      {items.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '64px 40px' }}>
          <div style={{ width: 76, height: 76, borderRadius: 999, background: TOK.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="archive" size={32} color={TOK.sub} />
          </div>
          <div style={{ fontFamily: TOK.serif, fontSize: 23, color: TOK.ink, marginTop: 20 }}>Kho lưu trữ trống</div>
          <p style={{ fontFamily: TOK.sans, fontSize: 14, lineHeight: 1.55, color: TOK.sub, margin: '8px 0 0', textWrap: 'pretty' }}>Lưu trữ những món ít mặc để tủ đồ gọn gàng. Chúng vẫn ở đây khi bạn cần.</p>
        </div>
      ) : (
        <>
          <p style={{ fontFamily: TOK.sans, fontSize: 13, color: TOK.sub, padding: '4px 22px 14px', textWrap: 'pretty' }}>{items.length} món đang ẩn khỏi tủ đồ và gợi ý. Khôi phục bất cứ lúc nào.</p>
          <div style={{ padding: '0 16px 30px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map(it => (
              <SoftCard key={it.id} pad={12} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-sm)', background: TOK.ground, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, flexShrink: 0, opacity: 0.85 }}>
                  <Garment kind={it.kind} color={it.color} accent={it.accent} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: TOK.sans, fontSize: 14, fontWeight: 600, color: TOK.ink }}>{it.name}</div>
                  <div style={{ fontFamily: TOK.sans, fontSize: 12, color: TOK.sub, marginTop: 2 }}>{it.type} · {it.occ}</div>
                </div>
                <button onClick={() => { store.restore(it.id); store.toast('Đã khôi phục vào tủ'); }} style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: TOK.accentSoft, color: TOK.accent, padding: '9px 14px', borderRadius: 999, fontFamily: TOK.sans, fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>
                  <Icon name="retry" size={14} color={TOK.accent} />Khôi phục
                </button>
              </SoftCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Tùy chỉnh giao diện ───────────────────────────────────────────────
const ACCENT_OPTS = [
  { val: '#A2543B', name: 'Nâu đất' },
  { val: '#5F7E64', name: 'Xanh rêu' },
  { val: '#2A2620', name: 'Than chì' },
  { val: '#7A5A6E', name: 'Mận khô' },
];
const PAPER_OPTS = [
  { val: 'Ấm', sw: '#F4EEE4' },
  { val: 'Trung tính', sw: '#F3F2EF' },
  { val: 'Sáng', sw: '#FAF9F6' },
];
const CORNER_OPTS = [
  { val: 'Mềm', r: 16 },
  { val: 'Vừa', r: 9 },
  { val: 'Sắc', r: 3 },
];

function FieldLabel({ children }) {
  return <div style={{ fontFamily: TOK.sans, fontSize: 14, fontWeight: 700, color: TOK.ink, margin: '24px 0 12px' }}>{children}</div>;
}

function AppearanceScreen() {
  const nav = React.useContext(NavCtx);
  const store = React.useContext(StoreCtx);
  const th = store.theme;

  return (
    <div style={{ minHeight: '100%', background: TOK.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '54px 16px 8px' }}>
        <IconBtn name="back" onClick={() => nav.goBack()} />
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: TOK.serif, fontSize: 19, color: TOK.ink }}>Tùy chỉnh giao diện</span>
        <div style={{ width: 42 }} />
      </div>

      <div style={{ padding: '8px 22px 40px' }}>
        {/* live preview */}
        <Kicker style={{ marginBottom: 10 }}>Xem trước</Kicker>
        <SoftCard lg>
          <Collage ids={[2, 8, 6, 12]} height={150} radius={0} pad={12} />
          <div style={{ padding: '14px 16px 16px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: TOK.sageSoft, color: TOK.sage, fontFamily: TOK.sans, fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>Đi làm</span>
            <div style={{ fontFamily: TOK.serif, fontSize: 20, color: TOK.ink, marginTop: 8 }}>Đi làm nhẹ nhàng</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <div style={{ height: 38, flex: 1, borderRadius: 999, background: TOK.ink, color: '#FBF8F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TOK.serif, fontSize: 14 }}>Mặc hôm nay</div>
              <div style={{ width: 38, height: 38, borderRadius: 999, border: `1.5px solid ${TOK.accent}`, background: TOK.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="heart" size={16} color={TOK.accent} /></div>
            </div>
          </div>
        </SoftCard>

        {/* accent */}
        <FieldLabel>Tông nhấn</FieldLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ACCENT_OPTS.map(o => {
            const on = th.accent === o.val;
            return (
              <button key={o.val} onClick={() => store.setTheme('accent', o.val)} style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer', border: `1.5px solid ${on ? o.val : TOK.line}`, background: on ? TOK.surface : TOK.surface, borderRadius: 14, padding: '12px 13px', boxShadow: on ? TOK.shadow : 'none', transition: 'all .15s' }}>
                <span style={{ width: 26, height: 26, borderRadius: 999, background: o.val, flexShrink: 0, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.5)', position: 'relative' }}>
                  {on && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={14} color="#fff" sw={2.6} /></span>}
                </span>
                <span style={{ fontFamily: TOK.sans, fontSize: 13.5, fontWeight: 600, color: TOK.ink }}>{o.name}</span>
              </button>
            );
          })}
        </div>

        {/* paper */}
        <FieldLabel>Tông giấy nền</FieldLabel>
        <div style={{ display: 'flex', gap: 10 }}>
          {PAPER_OPTS.map(o => {
            const on = th.paper === o.val;
            return (
              <button key={o.val} onClick={() => store.setTheme('paper', o.val)} style={{ flex: 1, cursor: 'pointer', border: `1.5px solid ${on ? TOK.accent : TOK.line}`, background: TOK.surface, borderRadius: 14, padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, boxShadow: on ? TOK.shadow : 'none', transition: 'all .15s' }}>
                <span style={{ width: '100%', height: 34, borderRadius: 9, background: o.sw, border: `1px solid ${TOK.line}` }} />
                <span style={{ fontFamily: TOK.sans, fontSize: 12.5, fontWeight: 600, color: on ? TOK.accent : TOK.sub }}>{o.val}</span>
              </button>
            );
          })}
        </div>

        {/* corners */}
        <FieldLabel>Độ bo góc</FieldLabel>
        <div style={{ display: 'flex', gap: 10 }}>
          {CORNER_OPTS.map(o => {
            const on = th.corners === o.val;
            return (
              <button key={o.val} onClick={() => store.setTheme('corners', o.val)} style={{ flex: 1, cursor: 'pointer', border: `1.5px solid ${on ? TOK.accent : TOK.line}`, background: TOK.surface, borderRadius: 14, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, boxShadow: on ? TOK.shadow : 'none', transition: 'all .15s' }}>
                <span style={{ width: 36, height: 28, borderTopLeftRadius: o.r, borderTopRightRadius: o.r, borderBottomLeftRadius: o.r, borderBottomRightRadius: o.r, background: on ? TOK.accentSoft : TOK.bg2, border: `1.5px solid ${on ? TOK.accent : TOK.line}` }} />
                <span style={{ fontFamily: TOK.sans, fontSize: 12.5, fontWeight: 600, color: on ? TOK.accent : TOK.sub }}>{o.val}</span>
              </button>
            );
          })}
        </div>

        {/* serif toggle */}
        <FieldLabel>Kiểu chữ tiêu đề</FieldLabel>
        <SoftCard pad={4}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: TOK.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: '"Playfair Display", serif', fontSize: 18, color: TOK.ink, fontStyle: 'italic' }}>Aa</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: TOK.sans, fontSize: 14, fontWeight: 600, color: TOK.ink }}>Tiêu đề chữ serif</div>
              <div style={{ fontFamily: TOK.sans, fontSize: 12, color: TOK.sub }}>Phong cách tạp chí editorial</div>
            </div>
            <div onClick={() => store.setTheme('serifHeads', !th.serifHeads)} style={{ width: 46, height: 28, borderRadius: 999, background: th.serifHeads ? TOK.sage : TOK.bg2, padding: 3, display: 'flex', justifyContent: th.serifHeads ? 'flex-end' : 'flex-start', transition: 'background .2s', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ width: 22, height: 22, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
        </SoftCard>

        <p style={{ fontFamily: TOK.sans, fontSize: 12, lineHeight: 1.5, color: TOK.faint, textAlign: 'center', margin: '22px 0 0', textWrap: 'pretty' }}>Thay đổi áp dụng ngay cho toàn bộ ứng dụng.</p>
      </div>
    </div>
  );
}

Object.assign(window, { ArchiveScreen, AppearanceScreen });
