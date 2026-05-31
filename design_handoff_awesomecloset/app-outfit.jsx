// app-outfit.jsx — Suggest flow (context → generating → results) + outfit detail
// Exports (window): SuggestScreen, OutfitScreen

function SuggestScreen() {
  const nav = React.useContext(NavCtx);
  const [phase, setPhase] = React.useState('context'); // context | gen | results
  const [occ, setOcc] = React.useState('Đi làm');
  const [weather, setWeather] = React.useState('auto');
  const [genStep, setGenStep] = React.useState(0);
  const weatherOpts = [['auto','Tự động','sun'],['Nóng','Nóng','sun'],['Mát','Mát','sun'],['Lạnh','Lạnh','sun'],['Mưa','Mưa','sun']];
  const genTexts = ['Đọc thời tiết & lịch sử mặc…', 'Quét 48 món trong tủ…', 'Phối theo dịp "' + occ + '"…', 'Hoàn thiện collage…'];

  const generate = () => {
    setPhase('gen'); setGenStep(0);
    let s = 0; const t = setInterval(() => { s++; setGenStep(s); if (s >= 3) { clearInterval(t); setTimeout(() => setPhase('results'), 700); } }, 650);
  };

  return (
    <div style={{ minHeight: '100%', background: TOK.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '54px 16px 8px' }}>
        <IconBtn name="back" onClick={() => nav.goBack()} />
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: TOK.serif, fontSize: 19, color: TOK.ink }}>Gợi ý outfit</span>
        <div style={{ width: 42 }} />
      </div>

      {phase === 'context' && (
        <div style={{ padding: '12px 22px 0' }}>
          <div style={{ fontFamily: TOK.serif, fontSize: 28, color: TOK.ink, letterSpacing: -0.3, lineHeight: 1.15 }}>Hôm nay bạn<br/>đi <span style={{ fontStyle: 'italic' }}>đâu?</span></div>
          <Kicker style={{ margin: '22px 0 12px' }}>Hoàn cảnh</Kicker>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {OCCASION_OPTS.map(o => (
              <button key={o.key} onClick={() => setOcc(o.key)} style={{ textAlign: 'left', cursor: 'pointer', border: `1.5px solid ${occ === o.key ? TOK.accent : TOK.line}`, background: occ === o.key ? TOK.accentSoft : TOK.surface, borderRadius: TOK.r, padding: '14px 15px', transition: 'all .15s' }}>
                <div style={{ fontSize: 22 }}>{o.emoji}</div>
                <div style={{ fontFamily: TOK.sans, fontSize: 14.5, fontWeight: 700, color: TOK.ink, marginTop: 6 }}>{o.key}</div>
                <div style={{ fontFamily: TOK.sans, fontSize: 11.5, color: TOK.sub, marginTop: 1 }}>{o.note}</div>
              </button>
            ))}
          </div>
          <Kicker style={{ margin: '24px 0 12px' }}>Thời tiết</Kicker>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {weatherOpts.map(([k, label]) => <Pill key={k} active={weather === k} soft={false} onClick={() => setWeather(k)}>{k === 'auto' ? `Tự động · ${WEATHER.temp}°` : label}</Pill>)}
          </div>
          <PrimaryBtn icon="spark" style={{ width: '100%', marginTop: 30 }} onClick={generate}>Tạo gợi ý</PrimaryBtn>
          <div style={{ height: 40 }} />
        </div>
      )}

      {phase === 'gen' && (
        <div style={{ padding: '40px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 92, height: 92, borderRadius: 999, background: TOK.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -6, borderRadius: 999, border: `3px solid ${TOK.accent}`, borderTopColor: 'transparent', animation: 'spin 0.9s linear infinite' }} />
            <Icon name="spark" size={38} color={TOK.accent} fill/>
          </div>
          <div style={{ fontFamily: TOK.serif, fontSize: 24, color: TOK.ink, marginTop: 26 }}>AI đang phối đồ…</div>
          <div style={{ fontFamily: TOK.sans, fontSize: 13.5, color: TOK.sub, marginTop: 8, minHeight: 20, transition: 'opacity .3s' }}>{genTexts[Math.min(genStep, genTexts.length - 1)]}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 18 }}>{genTexts.map((_, i) => <div key={i} style={{ width: 7, height: 7, borderRadius: 999, background: i <= genStep ? TOK.accent : TOK.line, transition: 'background .3s' }} />)}</div>
        </div>
      )}

      {phase === 'results' && (
        <div style={{ padding: '12px 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontFamily: TOK.serif, fontSize: 26, color: TOK.ink, letterSpacing: -0.3 }}>{OUTFITS.length} gợi ý cho <span style={{ fontStyle: 'italic' }}>{occ.toLowerCase()}</span></div>
          </div>
          <div style={{ fontFamily: TOK.sans, fontSize: 13, color: TOK.sub, marginTop: 4 }}>{WEATHER.temp}° · {WEATHER.cond.toLowerCase()}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
            {OUTFITS.map((o, i) => (
              <div key={o.id} onClick={() => nav.navigate('outfit', { id: o.id })} style={{ cursor: 'pointer' }}>
                <SoftCard lg>
                  <div style={{ position: 'relative' }}>
                    <Collage ids={o.items} height={180} radius={0} />
                    <span style={{ position: 'absolute', top: 12, left: 14, fontFamily: TOK.serif, fontStyle: 'italic', fontSize: 14, color: TOK.surface, background: 'rgba(30,27,22,0.55)', padding: '3px 10px', borderRadius: 999, backdropFilter: 'blur(4px)' }}>0{i + 1}</span>
                  </div>
                  <div style={{ padding: '14px 16px 16px' }}>
                    <div style={{ fontFamily: TOK.serif, fontSize: 20, color: TOK.ink }}>{o.name}</div>
                    <p style={{ fontFamily: TOK.sans, fontSize: 12.5, lineHeight: 1.5, color: TOK.sub, margin: '5px 0 0', textWrap: 'pretty' }}>{o.reason}</p>
                  </div>
                </SoftCard>
              </div>
            ))}
          </div>
          <GhostBtn icon="retry" style={{ width: '100%', margin: '18px 0 0' }} onClick={() => setPhase('context')}>Đổi hoàn cảnh & tạo lại</GhostBtn>
          <div style={{ height: 40 }} />
        </div>
      )}
    </div>
  );
}

function OutfitScreen({ params }) {
  const nav = React.useContext(NavCtx);
  const store = React.useContext(StoreCtx);
  const o = OUTFITS.find(x => x.id === params.id) || OUTFITS[0];
  const pieces = itemsOf(o.items);
  const [rateOpen, setRateOpen] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const ROLES = { 2:'Áo', 8:'Quần', 6:'Giày', 12:'Phụ kiện', 4:'Áo', 3:'Quần', 14:'Phụ kiện', 5:'Đầm', 15:'Giày' };

  return (
    <div style={{ minHeight: '100%', background: TOK.bg }}>
      <div style={{ background: TOK.ground, paddingTop: 54 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}>
          <IconBtn name="back" onClick={() => nav.goBack()} />
          <IconBtn name="heart" onClick={() => store.save(o)} color={store.isSaved(o.id) ? TOK.accent : TOK.ink} />
        </div>
        <div style={{ padding: '6px 20px 24px' }}><Collage ids={o.items} height={250} /></div>
      </div>

      <div style={{ padding: '22px 22px 0' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: TOK.sageSoft, color: TOK.sage, fontFamily: TOK.sans, fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 999 }}><Icon name="spark" size={12} color={TOK.sage} fill/>{o.occ}</span>
        <div style={{ fontFamily: TOK.serif, fontSize: 28, color: TOK.ink, marginTop: 12, letterSpacing: -0.3 }}>{o.name}</div>

        {/* AI reasoning */}
        <SoftCard pad={16} style={{ marginTop: 16, display: 'flex', gap: 12, background: TOK.accentSoft, boxShadow: 'none' }}>
          <Icon name="spark" size={20} color={TOK.accent} fill/>
          <div>
            <div style={{ fontFamily: TOK.sans, fontSize: 12, fontWeight: 700, color: TOK.accent, marginBottom: 4 }}>VÌ SAO AI CHỌN</div>
            <p style={{ fontFamily: TOK.sans, fontSize: 13.5, lineHeight: 1.55, color: TOK.ink2, margin: 0, textWrap: 'pretty' }}>{o.reason}</p>
          </div>
        </SoftCard>

        {/* weather chip */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: TOK.surface, boxShadow: TOK.shadow, padding: '8px 13px', borderRadius: 999, fontFamily: TOK.sans, fontSize: 12.5, color: TOK.ink2, fontWeight: 600 }}><Icon name="sun" size={15} color="#D9A441"/>{WEATHER.temp}° {WEATHER.cond.split(',')[0]}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: TOK.surface, boxShadow: TOK.shadow, padding: '8px 13px', borderRadius: 999, fontFamily: TOK.sans, fontSize: 12.5, color: TOK.ink2, fontWeight: 600 }}><Icon name="loc" size={14} color={TOK.sub}/>{WEATHER.city}</span>
        </div>

        {/* pieces */}
        <div style={{ fontFamily: TOK.sans, fontSize: 14, fontWeight: 700, color: TOK.ink, margin: '24px 0 12px' }}>{pieces.length} món trong outfit</div>
        <SoftCard pad={4}>
          {pieces.map((p, i) => (
            <div key={p.id} onClick={() => nav.navigate('item', { id: p.id })} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 14px', borderBottom: i < pieces.length - 1 ? `1px solid ${TOK.line}` : 'none', cursor: 'pointer' }}>
              <div style={{ width: 50, height: 50, borderRadius: 'var(--radius-sm)', background: TOK.ground, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 7 }}><Garment kind={p.kind} color={p.color} accent={p.accent} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: TOK.sans, fontSize: 13.5, fontWeight: 600, color: TOK.ink }}>{p.name}</div>
                <Kicker style={{ marginTop: 3 }}>{ROLES[p.id] || p.type}</Kicker>
              </div>
              <Icon name="chevron" size={16} color={TOK.faint}/>
            </div>
          ))}
        </SoftCard>

        {/* collage board — save / share */}
        <div style={{ fontFamily: TOK.sans, fontSize: 14, fontWeight: 700, color: TOK.ink, margin: '24px 0 12px' }}>Bảng phối (collage)</div>
        <SoftCard pad={14} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 60, height: 60, flexShrink: 0 }}><Collage ids={o.items} height={60} radius={12} pad={5} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: TOK.sans, fontSize: 13.5, fontWeight: 600, color: TOK.ink }}>Ảnh ghép outfit</div>
            <div style={{ fontFamily: TOK.sans, fontSize: 12, color: TOK.sub, marginTop: 1 }}>Lưu về máy hoặc chia sẻ</div>
          </div>
          <button onClick={() => store.toast('Đã lưu collage về ảnh ✓')} style={{ width: 42, height: 42, borderRadius: 999, border: `1.5px solid ${TOK.line}`, background: TOK.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="download" size={19} color={TOK.ink} /></button>
          <button onClick={() => store.toast('Mở bảng chia sẻ…')} style={{ width: 42, height: 42, borderRadius: 999, border: 'none', background: TOK.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="share" size={18} color="#FBF8F2" /></button>
        </SoftCard>

        {/* actions */}
        <div style={{ display: 'flex', gap: 10, margin: '22px 0 0' }}>
          <PrimaryBtn icon="wear" style={{ flex: 1 }} onClick={() => setRateOpen(true)}>Mặc hôm nay</PrimaryBtn>
          <IconBtn name="dislike" size={50} iconSize={20} onClick={() => { store.toast('Đã ẩn gợi ý này'); nav.goBack(); }} style={{ border: `1.5px solid ${TOK.line}`, boxShadow: 'none' }} />
        </div>
        <div style={{ height: 40 }} />
      </div>

      <Sheet open={rateOpen} onClose={() => setRateOpen(false)} title="Đã mặc outfit này!">
        <p style={{ fontFamily: TOK.sans, fontSize: 13.5, color: TOK.sub, margin: '0 0 18px' }}>Bạn thấy outfit hôm nay thế nào? Đánh giá giúp AI gợi ý hợp gu hơn.</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}><Stars value={rating} onRate={setRating} size={34} /></div>
        <PrimaryBtn style={{ width: '100%' }} onClick={() => { setRateOpen(false); store.wear(o); }}>Lưu nhật ký mặc</PrimaryBtn>
      </Sheet>
    </div>
  );
}

Object.assign(window, { SuggestScreen, OutfitScreen });
