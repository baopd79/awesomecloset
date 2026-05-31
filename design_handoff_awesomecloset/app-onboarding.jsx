// app-onboarding.jsx — 3-step first-run walkthrough
// Exports (window): Onboarding

function Onboarding({ onDone }) {
  const [step, setStep] = React.useState(0);
  const slides = [
    {
      kicker: 'Bước 01', title: ['Chụp', 'tủ đồ của bạn'],
      body: 'Chụp từng món hoặc chọn nhiều ảnh từ thư viện. App tự tách nền, giữ lại món đồ trên nền sạch.',
      hero: <div style={{ display: 'flex', gap: 14 }}>{['tee','jeans','sneakers'].map((k,i)=>(<div key={k} style={{ width: 92, height: 116, background: TOK.surface, borderRadius: 18, boxShadow: TOK.shadowLg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, transform: `rotate(${(i-1)*6}deg) translateY(${i===1?-10:6}px)` }}><Garment kind={k} color={['#e7e3da','#5b6b85','#ece8e1'][i]} accent={k==='sneakers'?'#d8d2c6':null}/></div>))}</div>,
      accent: 'accent',
    },
    {
      kicker: 'Bước 02', title: ['AI', 'tự gắn thẻ'],
      body: 'Mỗi món được nhận diện loại, màu, phong cách, mùa và dịp mặc — bạn chỉ việc duyệt lại nếu muốn.',
      hero: <div style={{ position: 'relative' }}><div style={{ width: 150, height: 150, background: TOK.surface, borderRadius: 24, boxShadow: TOK.shadowLg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 26 }}><Garment kind="shirt" color="#7d97b5"/></div>{[['Sơ mi',-18,16],['Xanh nhạt',120,40],['Công sở',-10,120],['Đi làm',128,118]].map(([t,x,y],i)=>(<span key={i} style={{ position: 'absolute', left: x, top: y, background: i%2?TOK.sageSoft:TOK.accentSoft, color: i%2?TOK.sage:TOK.accent, fontFamily: TOK.sans, fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 999, boxShadow: TOK.shadow, whiteSpace: 'nowrap' }}>{t}</span>))}</div>,
      accent: 'sage',
    },
    {
      kicker: 'Bước 03', title: ['Mặc đẹp', 'mỗi sáng'],
      body: 'Mỗi sáng AI gợi ý outfit hợp thời tiết và lịch của bạn. Đủ 15 món là mở khóa ngay.',
      hero: <div style={{ width: 200, background: TOK.surface, borderRadius: 22, boxShadow: TOK.shadowLg, overflow: 'hidden' }}><Collage ids={[2,8,6,12]} height={150} radius={0} pad={12}/><div style={{ padding: '12px 14px 14px' }}><span style={{ background: TOK.sageSoft, color: TOK.sage, fontFamily: TOK.sans, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>Đi làm</span><div style={{ fontFamily: TOK.serif, fontSize: 16, color: TOK.ink, marginTop: 8 }}>Đi làm nhẹ nhàng</div></div></div>,
      accent: 'accent',
    },
  ];
  const s = slides[step];
  const last = step === slides.length - 1;

  return (
    <div style={{ height: '100%', background: TOK.bg, display: 'flex', flexDirection: 'column', paddingTop: 50 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 22px' }}>
        {!last && <button onClick={onDone} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: TOK.sans, fontSize: 14, color: TOK.sub, fontWeight: 500 }}>Bỏ qua</button>}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 30px' }}>
        <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.hero}</div>
      </div>

      <div style={{ padding: '0 30px 40px' }}>
        <Kicker color={s.accent === 'sage' ? TOK.sage : TOK.accent}>{s.kicker}</Kicker>
        <div style={{ fontFamily: TOK.serif, fontSize: 38, lineHeight: 1.05, color: TOK.ink, marginTop: 12, letterSpacing: -0.5 }}>{s.title[0]} <span style={{ fontStyle: 'italic' }}>{s.title[1]}</span></div>
        <p style={{ fontFamily: TOK.sans, fontSize: 15, lineHeight: 1.6, color: TOK.sub, margin: '14px 0 0', textWrap: 'pretty' }}>{s.body}</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 32 }}>
          <div style={{ display: 'flex', gap: 7 }}>
            {slides.map((_, i) => <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 999, background: i === step ? TOK.accent : TOK.line, transition: 'all .3s' }} />)}
          </div>
          <PrimaryBtn icon={last ? 'check' : undefined} onClick={() => last ? onDone() : setStep(step + 1)} style={{ paddingRight: last ? 24 : 18 }}>
            {last ? 'Bắt đầu' : 'Tiếp tục'}{!last && <Icon name="chevron" size={17} color="#FBF8F2"/>}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Onboarding });
