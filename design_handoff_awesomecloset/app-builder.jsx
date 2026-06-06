// app-builder.jsx — Manual outfit builder (chọn từng món → ghép outfit)
// Map API: POST /api/outfits (tạo thủ công) + PATCH /{id}/items
// Slot theo role (khớp collage role-based): top → bottom → footer → accessory
// Exports (window): BuilderScreen

const SLOTS = [
  { role: 'top',    label: 'Áo',         kinds: ['tee','shirt','hoodie','sweater','jacket','coat','dress'], icon: 'closet', required: true },
  { role: 'bottom', label: 'Quần & Váy', kinds: ['pants','jeans','shorts','skirt'], icon: 'closet', required: true },
  { role: 'footer', label: 'Giày',       kinds: ['sneakers','boots'], icon: 'closet', required: false },
  { role: 'acc',    label: 'Phụ kiện',   kinds: ['bag','cap','glasses'], icon: 'spark', required: false },
];

function BuilderSlot({ slot, item, onPick, onClear }) {
  return (
    <div onClick={onPick} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, background: TOK.surface, borderRadius: 'var(--radius)', padding: 12, boxShadow: TOK.shadow, border: item ? `1.5px solid ${TOK.line}` : `1.5px dashed ${TOK.line}` }}>
      <div style={{ width: 66, height: 66, borderRadius: 'var(--radius-sm)', background: TOK.ground, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 9, flexShrink: 0 }}>
        {item ? <Garment kind={item.kind} color={item.color} accent={item.accent} />
              : <Icon name="plus" size={22} color={TOK.faint} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: TOK.sans, fontSize: 13.5, fontWeight: 700, color: TOK.ink }}>{slot.label}</span>
          {slot.required && <span style={{ fontFamily: TOK.sans, fontSize: 10, fontWeight: 700, color: TOK.accent, background: TOK.accentSoft, padding: '2px 7px', borderRadius: 999 }}>BẮT BUỘC</span>}
        </div>
        <div style={{ fontFamily: TOK.sans, fontSize: 12.5, color: item ? TOK.sub : TOK.faint, marginTop: 3 }}>{item ? item.name : 'Chạm để chọn món'}</div>
      </div>
      {item
        ? <button onClick={(e) => { e.stopPropagation(); onClear(); }} style={{ border: 'none', background: TOK.bg2, cursor: 'pointer', width: 34, height: 34, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="close" size={15} color={TOK.sub} /></button>
        : <Icon name="chevron" size={18} color={TOK.faint} />}
    </div>
  );
}

function BuilderScreen() {
  const nav = React.useContext(NavCtx);
  const store = React.useContext(StoreCtx);
  const [picked, setPicked] = React.useState({}); // role -> item
  const [pickerSlot, setPickerSlot] = React.useState(null);
  const [name, setName] = React.useState('');
  const [occ, setOcc] = React.useState('Đi chơi');
  const [saveOpen, setSaveOpen] = React.useState(false);

  const chosen = SLOTS.map(s => picked[s.role]).filter(Boolean);
  const canSave = picked.top && picked.bottom; // top + bottom bắt buộc

  const pickItem = (it) => { setPicked(p => ({ ...p, [pickerSlot.role]: it })); setPickerSlot(null); };
  const pickerItems = pickerSlot ? store.closet.filter(c => pickerSlot.kinds.includes(c.kind)) : [];

  return (
    <div style={{ minHeight: '100%', background: TOK.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '54px 16px 8px' }}>
        <IconBtn name="back" onClick={() => nav.goBack()} />
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: TOK.serif, fontSize: 19, color: TOK.ink }}>Tự phối outfit</span>
        <div style={{ width: 42 }} />
      </div>

      {/* live preview */}
      <div style={{ padding: '8px 22px 0' }}>
        {chosen.length === 0
          ? <div style={{ height: 200, borderRadius: 'var(--radius)', border: `1.5px dashed ${TOK.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: TOK.faint, background: TOK.surface }}>
              <Icon name="spark" size={28} color={TOK.faint} />
              <span style={{ fontFamily: TOK.sans, fontSize: 13.5 }}>Chọn món bên dưới để xem trước</span>
            </div>
          : <SoftCard lg><Collage ids={chosen.map(i => i.id)} height={200} radius={0} /></SoftCard>}
      </div>

      {/* slots */}
      <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SLOTS.map(slot => (
          <BuilderSlot key={slot.role} slot={slot} item={picked[slot.role]} onPick={() => setPickerSlot(slot)} onClear={() => setPicked(p => { const n = { ...p }; delete n[slot.role]; return n; })} />
        ))}
      </div>

      {/* save bar */}
      <div style={{ padding: '24px 22px 40px' }}>
        <PrimaryBtn icon="check" style={{ width: '100%', opacity: canSave ? 1 : 0.45, pointerEvents: canSave ? 'auto' : 'none' }} onClick={() => setSaveOpen(true)}>
          Lưu outfit ({chosen.length} món)
        </PrimaryBtn>
        {!canSave && <p style={{ fontFamily: TOK.sans, fontSize: 12, color: TOK.faint, textAlign: 'center', margin: '10px 0 0' }}>Cần ít nhất 1 áo và 1 quần/váy</p>}
      </div>

      {/* item picker sheet */}
      <Sheet open={!!pickerSlot} onClose={() => setPickerSlot(null)} title={pickerSlot ? `Chọn ${pickerSlot.label.toLowerCase()}` : ''}>
        {pickerItems.length === 0
          ? <div style={{ textAlign: 'center', padding: '20px 0 8px', fontFamily: TOK.sans, fontSize: 13.5, color: TOK.sub }}>Tủ đồ chưa có món nào nhóm này</div>
          : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {pickerItems.map(it => {
                const on = pickerSlot && picked[pickerSlot.role] && picked[pickerSlot.role].id === it.id;
                return (
                  <button key={it.id} onClick={() => pickItem(it)} style={{ border: `1.5px solid ${on ? TOK.accent : 'transparent'}`, background: TOK.bg, borderRadius: 'var(--radius-sm)', padding: 0, cursor: 'pointer', overflow: 'hidden' }}>
                    <div style={{ aspectRatio: '1', background: TOK.ground, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}><Garment kind={it.kind} color={it.color} accent={it.accent} /></div>
                    <div style={{ fontFamily: TOK.sans, fontSize: 10.5, fontWeight: 600, color: TOK.ink, padding: '6px 6px 8px', lineHeight: 1.2, textAlign: 'center' }}>{it.type}</div>
                  </button>
                );
              })}
            </div>}
      </Sheet>

      {/* save sheet: name + occasion → POST /api/outfits */}
      <Sheet open={saveOpen} onClose={() => setSaveOpen(false)} title="Đặt tên outfit">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: TOK.bg, borderRadius: 14, padding: '13px 15px', marginBottom: 18 }}>
          <Icon name="edit" size={18} color={TOK.sub} />
          <input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Đi cà phê cuối tuần" style={{ border: 'none', outline: 'none', background: 'none', flex: 1, fontFamily: TOK.sans, fontSize: 15, color: TOK.ink }} />
        </div>
        <Kicker style={{ marginBottom: 10 }}>Dịp</Kicker>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
          {['Đi học','Đi làm','Đi chơi','Hẹn hò','Dự tiệc','Du lịch'].map(o => <Pill key={o} soft={occ === o} active={false} onClick={() => setOcc(o)}>{o}</Pill>)}
        </div>
        <PrimaryBtn style={{ width: '100%' }} onClick={() => { setSaveOpen(false); store.toast('Đã lưu outfit vào bộ sưu tập ✓'); setStack && nav.goBack(); }}>Lưu vào bộ sưu tập</PrimaryBtn>
      </Sheet>
    </div>
  );
}

Object.assign(window, { BuilderScreen });
