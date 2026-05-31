// app-analytics.jsx — Style analytics: colors, unworn items, wear calendar
// Exports (window): AnalyticsScreen

function SectionHead({ kicker, title }) {
  return (
    <div style={{ padding: '26px 22px 12px' }}>
      <Kicker>{kicker}</Kicker>
      <div style={{ fontFamily: TOK.serif, fontSize: 21, color: TOK.ink, marginTop: 5 }}>{title}</div>
    </div>
  );
}

function AnalyticsScreen() {
  const nav = React.useContext(NavCtx);
  const maxColor = Math.max(...COLOR_STATS.map(c => c.count));
  const wornDays = MONTH_DAYS.filter(d => d.occ).length;

  return (
    <div style={{ minHeight: '100%', paddingTop: 50 }}>
      <div style={{ padding: '6px 22px 4px' }}>
        <Kicker>Tháng 5 · 2026</Kicker>
        <div style={{ fontFamily: TOK.serif, fontSize: 34, color: TOK.ink, letterSpacing: -0.5, marginTop: 6 }}>Thống kê</div>
      </div>

      {/* summary stats */}
      <div style={{ display: 'flex', gap: 10, padding: '14px 16px 0' }}>
        {[['48','món đồ'],['128','outfit'],[wornDays + '','ngày mặc']].map(([n, l]) => (
          <SoftCard key={l} pad={14} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: TOK.serif, fontSize: 27, color: TOK.ink }}>{n}</div>
            <Kicker style={{ marginTop: 2 }}>{l}</Kicker>
          </SoftCard>
        ))}
      </div>

      {/* colors */}
      <SectionHead kicker="Bảng màu" title="Màu bạn mặc nhiều nhất" />
      <SoftCard pad={18} style={{ margin: '0 16px' }}>
        {COLOR_STATS.map((c, i) => (
          <div key={c.name} style={{ marginBottom: i < COLOR_STATS.length - 1 ? 14 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 16, height: 16, borderRadius: 5, background: c.hex, border: `1px solid ${TOK.line}` }} />
                <span style={{ fontFamily: TOK.sans, fontSize: 13, color: TOK.ink, fontWeight: 500 }}>{c.name}</span>
              </div>
              <span style={{ fontFamily: TOK.sans, fontSize: 12.5, color: TOK.sub, fontWeight: 600 }}>{c.count}</span>
            </div>
            <Bar value={c.count} max={maxColor} color={c.hex} h={9} />
          </div>
        ))}
      </SoftCard>

      {/* unworn */}
      <SectionHead kicker="Ngủ quên" title={`${UNWORN.length} món chưa mặc lần nào`} />
      <div style={{ display: 'flex', gap: 12, padding: '0 16px', overflowX: 'auto' }}>
        {UNWORN.map(it => (
          <div key={it.id} onClick={() => nav.navigate('item', { id: it.id })} style={{ width: 130, flexShrink: 0, cursor: 'pointer' }}>
            <SoftCard>
              <div style={{ height: 130, background: TOK.ground, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, position: 'relative' }}>
                <Garment kind={it.kind} color={it.color} accent={it.accent} />
                <span style={{ position: 'absolute', top: 9, left: 9, fontFamily: TOK.sans, fontSize: 9, fontWeight: 700, color: TOK.accent, background: TOK.accentSoft, padding: '3px 6px', borderRadius: 999 }}>CHƯA MẶC</span>
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ fontFamily: TOK.sans, fontSize: 12.5, fontWeight: 600, color: TOK.ink, lineHeight: 1.25 }}>{it.name}</div>
              </div>
            </SoftCard>
          </div>
        ))}
      </div>

      {/* calendar */}
      <SectionHead kicker="Nhật ký" title="Outfit tháng này" />
      <SoftCard pad={18} style={{ margin: '0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 7, marginBottom: 8 }}>
          {['T2','T3','T4','T5','T6','T7','CN'].map(d => <div key={d} style={{ textAlign: 'center', fontFamily: TOK.sans, fontSize: 10.5, color: TOK.faint, fontWeight: 600 }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 7 }}>
          {[null,null,null].map((_, i) => <div key={'e'+i} />)}
          {MONTH_DAYS.map(d => (
            <div key={d.day} style={{ aspectRatio: '1', borderRadius: 10, background: d.occ ? OCC_COLOR[d.occ] : TOK.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <span style={{ fontFamily: TOK.sans, fontSize: 11, fontWeight: 600, color: d.occ ? '#FBF8F2' : TOK.faint }}>{d.day}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
          {Object.entries(OCC_COLOR).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 11, height: 11, borderRadius: 4, background: v }} />
              <span style={{ fontFamily: TOK.sans, fontSize: 11.5, color: TOK.sub }}>{k}</span>
            </div>
          ))}
        </div>
      </SoftCard>
      <div style={{ height: 100 }} />
    </div>
  );
}

Object.assign(window, { AnalyticsScreen });
