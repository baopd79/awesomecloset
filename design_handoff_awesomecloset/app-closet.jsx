// app-closet.jsx — Digital closet (masonry + live filter + search) & item detail
// Exports (window): ClosetScreen, ItemScreen

const CATS = {
  'Tất cả': null,
  'Áo': ['tee','shirt','hoodie','sweater','jacket','coat'],
  'Quần & Váy': ['pants','jeans','shorts','skirt','dress'],
  'Giày': ['sneakers','boots'],
  'Phụ kiện': ['bag','cap','glasses'],
};
const SEASON_OF = { tee:'Xuân hè', shorts:'Xuân hè', dress:'Xuân hè', skirt:'Xuân hè', shirt:'Quanh năm', jeans:'Quanh năm', pants:'Quanh năm', sneakers:'Quanh năm', bag:'Quanh năm', cap:'Quanh năm', glasses:'Xuân hè', hoodie:'Thu đông', sweater:'Thu đông', jacket:'Thu đông', coat:'Thu đông', boots:'Thu đông' };

function ClosetScreen() {
  const nav = React.useContext(NavCtx);
  const store = React.useContext(StoreCtx);
  const [cat, setCat] = React.useState('Tất cả');
  const [q, setQ] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  let items = store.closet;
  if (CATS[cat]) items = items.filter(i => CATS[cat].includes(i.kind));
  if (q.trim()) items = items.filter(i => (i.name + i.type + i.occ + i.style).toLowerCase().includes(q.trim().toLowerCase()));
  const H = [150, 184, 162, 198, 156, 176, 192, 152, 170];

  return (
    <div style={{ minHeight: '100%', paddingTop: 50 }}>
      <div style={{ padding: '6px 22px 2px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Kicker>{store.closet.length} món · 6 nhóm</Kicker>
          <div style={{ fontFamily: TOK.serif, fontSize: 34, color: TOK.ink, letterSpacing: -0.5, marginTop: 6 }}>Tủ đồ</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => nav.navigate('builder')} style={{ display: 'flex', alignItems: 'center', gap: 7, border: 'none', cursor: 'pointer', height: 42, padding: '0 16px', borderRadius: 999, background: TOK.ink, color: '#FBF8F2', fontFamily: TOK.sans, fontSize: 13.5, fontWeight: 600, boxShadow: TOK.shadow }}>
            <Icon name="spark" size={16} color="#FBF8F2" fill/>Tự phối
          </button>
          <IconBtn name="filter" onClick={() => {}} />
        </div>
      </div>

      {/* search */}
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: TOK.surface, borderRadius: 999, padding: '11px 16px', boxShadow: TOK.shadow, border: focused ? `1.5px solid ${TOK.accent}` : '1.5px solid transparent' }}>
          <Icon name="search" size={18} color={TOK.sub} />
          <input value={q} onChange={e => setQ(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="Tìm trong tủ đồ" style={{ border: 'none', outline: 'none', background: 'none', flex: 1, fontFamily: TOK.sans, fontSize: 15, color: TOK.ink }} />
          {q && <button onClick={() => setQ('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}><Icon name="close" size={16} color={TOK.faint}/></button>}
        </div>
      </div>

      {/* filter pills */}
      <div style={{ display: 'flex', gap: 8, padding: '4px 16px 16px', overflowX: 'auto' }}>
        {Object.keys(CATS).map(c => <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Pill>)}
      </div>

      {/* masonry */}
      {items.length === 0
        ? <div style={{ textAlign: 'center', padding: '50px 30px', color: TOK.sub }}>
            <div style={{ fontFamily: TOK.serif, fontSize: 20, color: TOK.ink }}>Không tìm thấy món nào</div>
            <div style={{ fontFamily: TOK.sans, fontSize: 13.5, marginTop: 6 }}>Thử bỏ bộ lọc hoặc từ khoá khác</div>
          </div>
        : <div style={{ columns: 2, columnGap: 12, padding: '0 16px' }}>
            {items.map((it, i) => (
              <div key={it.id} onClick={() => nav.navigate('item', { id: it.id })} style={{ breakInside: 'avoid', marginBottom: 12, cursor: 'pointer' }}>
                <SoftCard>
                  <div style={{ height: H[i % H.length], background: TOK.ground, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
                    <Garment kind={it.kind} color={it.color} accent={it.accent} />
                    {it.worn === 0 && <span style={{ position: 'absolute', top: 10, left: 10, fontFamily: TOK.sans, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, color: TOK.accent, background: TOK.accentSoft, padding: '3px 7px', borderRadius: 999 }}>CHƯA MẶC</span>}
                  </div>
                  <div style={{ padding: '11px 13px 13px' }}>
                    <div style={{ fontFamily: TOK.serif, fontSize: 15.5, color: TOK.ink, lineHeight: 1.2 }}>{it.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: it.color, border: `1px solid ${TOK.line}` }} />
                      <span style={{ fontFamily: TOK.sans, fontSize: 11, color: TOK.sub }}>{it.occ}</span>
                    </div>
                  </div>
                </SoftCard>
              </div>
            ))}
          </div>}
      <div style={{ height: 100 }} />
    </div>
  );
}

function TagChip({ children, swatch }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: TOK.bg2, color: TOK.ink2, fontFamily: TOK.sans, fontSize: 12.5, fontWeight: 600, padding: '7px 13px', borderRadius: 999 }}>
      {swatch && <span style={{ width: 11, height: 11, borderRadius: 999, background: swatch, border: `1px solid ${TOK.line}` }} />}{children}
    </span>
  );
}

function ItemScreen({ params }) {
  const nav = React.useContext(NavCtx);
  const store = React.useContext(StoreCtx);
  const [editOpen, setEditOpen] = React.useState(false);
  const [cutout, setCutout] = React.useState(false);
  const it = store.closet.find(c => c.id === params.id) || CLOSET.find(c => c.id === params.id);
  if (!it) return null;
  const cols = colorsOf(it);
  const styles = stylesOf(it);
  const history = it.worn > 0 ? [['28.05','Đi làm'],['21.05','Đi chơi'],['14.05','Đi học']].slice(0, Math.min(3, it.worn)) : [];

  return (
    <div style={{ minHeight: '100%', background: TOK.bg }}>
      {/* hero */}
      <div style={{ background: TOK.ground, paddingTop: 54, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}>
          <IconBtn name="back" onClick={() => nav.goBack()} />
          <IconBtn name="archive" onClick={() => { store.archive(it.id); nav.goBack(); store.toast('Đã lưu trữ món đồ'); }} />
        </div>
        <div style={{ height: 270, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 60px 30px' }}>
          <Garment kind={it.kind} color={it.color} accent={it.accent} />
        </div>
      </div>

      <div style={{ padding: '22px 22px 0' }}>
        <Kicker>{it.type} · {seasonOf(it)}</Kicker>
        <div style={{ fontFamily: TOK.serif, fontSize: 28, color: TOK.ink, marginTop: 8, letterSpacing: -0.3 }}>{it.name}</div>
        <div style={{ fontFamily: TOK.sans, fontSize: 13.5, color: TOK.sub, marginTop: 6 }}>{fmtWorn(it.worn)}{it.worn > 0 ? ' · gần nhất 28.05' : ''}</div>

        {/* Improve cutout (fallback Remove.bg) */}
        <button onClick={() => { setCutout(true); setTimeout(() => { setCutout(false); store.toast('Đã tách nền lại — nét hơn'); }, 1600); }} disabled={cutout} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, border: `1.5px solid ${TOK.line}`, background: TOK.surface, cursor: cutout ? 'default' : 'pointer', padding: '10px 14px', borderRadius: 999, fontFamily: TOK.sans, fontSize: 13, fontWeight: 600, color: TOK.ink2, boxShadow: TOK.shadow }}>
          {cutout
            ? <><span style={{ width: 15, height: 15, borderRadius: 999, border: `2px solid ${TOK.accent}`, borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }} />Đang xử lý lại…</>
            : <><Icon name="spark" size={15} color={TOK.accent} fill/>Cải thiện tách nền</>}
        </button>

        {/* colors */}
        <div style={{ fontFamily: TOK.sans, fontSize: 14, fontWeight: 700, color: TOK.ink, margin: '24px 0 12px' }}>Màu sắc</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {cols.map((c, i) => (
            <TagChip key={i} swatch={c.hex}>{c.name}{c.dominant ? ' · chủ đạo' : ''}</TagChip>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 12px' }}>
          <span style={{ fontFamily: TOK.sans, fontSize: 14, fontWeight: 700, color: TOK.ink }}>Thẻ gắn (AI)</span>
          <button onClick={() => setEditOpen(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: TOK.accent, fontFamily: TOK.sans, fontSize: 13, fontWeight: 600 }}><Icon name="edit" size={15} color={TOK.accent}/>Sửa</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <TagChip>{it.type}</TagChip>
          <TagChip>{it.occ}</TagChip>
          <TagChip>{seasonOf(it)}</TagChip>
          {styles.map(t => <TagChip key={t}>{t}</TagChip>)}
        </div>

        {/* wear history */}
        <div style={{ fontFamily: TOK.sans, fontSize: 14, fontWeight: 700, color: TOK.ink, margin: '24px 0 12px' }}>Lịch sử mặc</div>
        {history.length === 0
          ? <SoftCard pad={16} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: TOK.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="spark" size={18} color={TOK.accent} fill/></div>
              <div><div style={{ fontFamily: TOK.sans, fontSize: 13.5, fontWeight: 600, color: TOK.ink }}>Món này còn "ngủ quên"</div><div style={{ fontFamily: TOK.sans, fontSize: 12, color: TOK.sub }}>Thử đưa vào gợi ý hôm nay nhé</div></div>
            </SoftCard>
          : <SoftCard pad={4}>
              {history.map(([d, o], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < history.length - 1 ? `1px solid ${TOK.line}` : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: TOK.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="wear" size={17} color={TOK.ink2}/></div>
                  <div style={{ flex: 1 }}><div style={{ fontFamily: TOK.sans, fontSize: 13.5, fontWeight: 600, color: TOK.ink }}>{o}</div><div style={{ fontFamily: TOK.sans, fontSize: 11.5, color: TOK.sub }}>Ngày {d}</div></div>
                </div>
              ))}
            </SoftCard>}

        <PrimaryBtn icon="spark" style={{ width: '100%', margin: '24px 0' }} onClick={() => nav.navigate('suggest')}>Phối đồ với món này</PrimaryBtn>
      </div>
      <div style={{ height: 40 }} />

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Sửa thẻ gắn">
        <Kicker style={{ marginBottom: 10 }}>Phong cách</Kicker>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {['Casual','Công sở','Streetwear','Tối giản','Thanh lịch','Thể thao'].map((s) => <Pill key={s} soft={styles.includes(s)} active={false}>{s}</Pill>)}
        </div>
        <Kicker style={{ marginBottom: 10 }}>Mùa</Kicker>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {['Xuân hè','Thu đông','Quanh năm'].map((s) => <Pill key={s} soft={s===seasonOf(it)} active={false}>{s}</Pill>)}
        </div>
        <Kicker style={{ marginBottom: 10 }}>Dịp</Kicker>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
          {['Đi học','Đi làm','Đi chơi','Hẹn hò','Dự tiệc','Du lịch'].map((s) => <Pill key={s} soft={s===it.occ} active={false}>{s}</Pill>)}
        </div>
        <PrimaryBtn style={{ width: '100%' }} onClick={() => { setEditOpen(false); store.toast('Đã cập nhật thẻ'); }}>Lưu thay đổi</PrimaryBtn>
      </Sheet>
    </div>
  );
}

Object.assign(window, { ClosetScreen, ItemScreen });
