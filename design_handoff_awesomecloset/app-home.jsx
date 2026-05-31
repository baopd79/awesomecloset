// app-home.jsx — Home / Hôm nay
// Greeting + weather + streak + today's AI suggestions (with the 15-item gate).
// Exports (window): HomeScreen

function WeatherStrip() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, padding: '4px 22px 20px' }}>
      <div style={{ fontFamily: TOK.serif, fontSize: 56, lineHeight: 0.85, letterSpacing: -1.5, color: TOK.ink }}>{WEATHER.temp}°</div>
      <div style={{ paddingBottom: 5, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon name="sun" size={18} color="#D9A441" />
          <span style={{ fontFamily: TOK.sans, fontSize: 14, fontWeight: 600, color: TOK.ink }}>{WEATHER.cond}</span>
        </div>
        <div style={{ fontFamily: TOK.sans, fontSize: 12.5, color: TOK.sub, marginTop: 3 }}>Cao {WEATHER.hi}° · Thấp {WEATHER.lo}° · Mưa rào chiều {WEATHER.rain}%</div>
      </div>
    </div>);

}

function StreakCard() {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  return (
    <SoftCard style={{ margin: '0 16px 8px' }} pad={16}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: TOK.serif, fontSize: 30, color: TOK.ink }}>7</span>
            <span style={{ fontFamily: TOK.sans, fontSize: 13, fontWeight: 600, color: TOK.ink }}>ngày liên tiếp</span>
            <span style={{ fontSize: 17 }}>🔥</span>
          </div>
          <Kicker style={{ marginTop: 4 }}>Chuỗi phối đồ của bạn</Kicker>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
        {days.map((d, i) =>
        <div key={d} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: 30, borderRadius: 8, background: i < 6 ? TOK.accent : TOK.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {i < 6 && <Icon name="check" size={15} color="#FBF8F2" sw={2.4} />}
            </div>
            <div style={{ fontFamily: TOK.sans, fontSize: 10, color: TOK.faint, marginTop: 4 }}>{d}</div>
          </div>
        )}
      </div>
    </SoftCard>);

}

function LockedGate({ count, required, nav }) {
  return (
    <SoftCard style={{ margin: '0 16px' }} pad={20} lg>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: TOK.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={19} color={TOK.accent} />
        </div>
        <div>
          <div style={{ fontFamily: TOK.serif, fontSize: 20, color: TOK.ink }}>Sắp mở khóa gợi ý</div>
          <div style={{ fontFamily: TOK.sans, fontSize: 12.5, color: TOK.sub }}>Thêm {required - count} món nữa để AI bắt đầu phối đồ</div>
        </div>
      </div>
      <Bar value={count} max={required} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontFamily: TOK.sans, fontSize: 12, color: TOK.sub }}><b style={{ color: TOK.ink }}>{count}</b> / {required} món sẵn sàng</span>
        <span style={{ fontFamily: TOK.sans, fontSize: 12, color: TOK.accent, fontWeight: 600 }}>{Math.round(count / required * 100)}%</span>
      </div>
      <PrimaryBtn icon="camera" style={{ width: '100%', marginTop: 16 }} onClick={() => nav.setTab('add')}>Thêm đồ vào tủ</PrimaryBtn>
    </SoftCard>);

}

function SuggestionHero({ outfit, nav, store }) {
  return (
    <SoftCard style={{ margin: '0 16px' }} lg>
      <div onClick={() => nav.navigate('outfit', { id: outfit.id })} style={{ cursor: 'pointer' }}>
        <Collage ids={outfit.items} height={210} radius={0} />
      </div>
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: TOK.sageSoft, color: TOK.sage, fontFamily: TOK.sans, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}><Icon name="spark" size={12} color={TOK.sage} fill />{outfit.occ}</span>
        </div>
        <div style={{ fontFamily: TOK.serif, fontSize: 25, color: TOK.ink, marginTop: 10, letterSpacing: -0.2 }}>{outfit.name}</div>
        <p style={{ fontFamily: TOK.sans, fontSize: 13.5, lineHeight: 1.55, color: TOK.sub, margin: '6px 0 0', textWrap: 'pretty' }}>{outfit.reason}</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <PrimaryBtn icon="wear" style={{ flex: 1 }} onClick={() => store.wear(outfit)}>Mặc hôm nay</PrimaryBtn>
          <IconBtn name="heart" size={50} iconSize={20} onClick={() => store.save(outfit)} color={store.isSaved(outfit.id) ? TOK.accent : TOK.ink} style={{ border: `1.5px solid ${TOK.line}`, boxShadow: 'none' }} />
        </div>
      </div>
    </SoftCard>);

}

function MiniOutfit({ outfit, nav }) {
  return (
    <div onClick={() => nav.navigate('outfit', { id: outfit.id })} style={{ width: 200, flexShrink: 0, cursor: 'pointer' }}>
      <SoftCard>
        <Collage ids={outfit.items} height={130} radius={0} pad={10} />
        <div style={{ padding: '11px 13px 13px' }}>
          <Kicker>{outfit.occ}</Kicker>
          <div style={{ fontFamily: TOK.serif, fontSize: 16, color: TOK.ink, marginTop: 4 }}>{outfit.name}</div>
        </div>
      </SoftCard>
    </div>);

}

function HomeScreen() {
  const nav = React.useContext(NavCtx);
  const store = React.useContext(StoreCtx);
  const locked = store.readyCount < 15;
  return (
    <div style={{ minHeight: '100%', paddingTop: 50 }}>
      <div style={{ padding: '6px 22px 2px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Kicker>Thứ Bảy · 31.05 · {WEATHER.city}</Kicker>
          <div style={{ fontFamily: TOK.serif, fontSize: 33, lineHeight: 1.05, color: TOK.ink, marginTop: 8, letterSpacing: -0.4 }}>Chào buổi sáng,<br /><span style={{ fontStyle: 'italic' }}>Linh</span></div>
        </div>
        <div onClick={() => nav.navigate('profile')} style={{ width: 46, height: 46, borderRadius: 999, background: 'linear-gradient(135deg,#D8C7B0,#A2543B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: TOK.serif, fontSize: 18, marginTop: 4, boxShadow: TOK.shadow, cursor: 'pointer' }}>L</div>
      </div>

      <WeatherStrip />
      <StreakCard />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '20px 22px 12px' }}>
        <span style={{ fontFamily: TOK.serif, fontSize: 21, color: TOK.ink }}>Gợi ý hôm nay</span>
        {!locked && <button onClick={() => nav.navigate('suggest')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: TOK.sans, fontSize: 13, fontWeight: 600, color: TOK.accent, display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="retry" size={14} color={TOK.accent} />Làm mới</button>}
      </div>

      {locked ?
      <LockedGate count={store.readyCount} required={15} nav={nav} /> :
      <>
            <SuggestionHero outfit={OUTFITS[0]} nav={nav} store={store} />
            <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'baseline', padding: '22px 22px 12px' }}>
              <span style={{ fontFamily: TOK.sans, fontSize: 14, fontWeight: 700, color: TOK.ink }}>Thêm lựa chọn</span>
            </div>
            <div style={{ display: 'flex', gap: 13, padding: '0 16px 12px', overflowX: 'auto' }}>
              {OUTFITS.slice(1).map((o) => <MiniOutfit key={o.id} outfit={o} nav={nav} />)}
              <div onClick={() => nav.navigate('suggest')} style={{ width: 200, flexShrink: 0, cursor: 'pointer' }}>
                <div style={{ height: '100%', minHeight: 195, borderRadius: TOK.r, border: `1.5px dashed ${TOK.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: TOK.accent }}>
                  <div style={{ width: 44, height: 44, borderRadius: 999, background: TOK.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="spark" size={22} color={TOK.accent} fill /></div>
                  <span style={{ fontFamily: TOK.sans, fontSize: 13, fontWeight: 600 }}>Gợi ý theo dịp khác</span>
                </div>
              </div>
            </div>
          </>}
      <div style={{ height: 100 }} />
    </div>);

}

Object.assign(window, { HomeScreen });