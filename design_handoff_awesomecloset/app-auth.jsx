// app-auth.jsx — Welcome / Login / Signup (Warm Editorial Soft)
// Exports (window): AuthFlow
// onAuthed(isNewUser) — isNewUser=true routes through onboarding afterwards.

function BrandMark({ size = 56 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ width: size, height: size, borderRadius: 20, background: TOK.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: TOK.shadowLg }}>
        {/* hanger mark */}
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24">
          <path d="M12 4a2 2 0 00-1 3.7c.6.3 1 .8 1 1.5L3.5 14c-1 .6-1.5 1.3-1.5 2 0 1 .9 1.5 2 1.5h16c1.1 0 2-.5 2-1.5 0-.7-.5-1.4-1.5-2L13 9.2"
            fill="none" stroke="#FBF8F2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

function Field({ icon, label, type = 'text', value, onChange, placeholder, trailing }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <div style={{ fontFamily: TOK.sans, fontSize: 12, fontWeight: 600, color: TOK.sub, marginBottom: 7, letterSpacing: 0.2 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: TOK.surface, borderRadius: 14, padding: '13px 15px', boxShadow: TOK.shadow, border: `1.5px solid ${focus ? TOK.accent : 'transparent'}`, transition: 'border .15s' }}>
        <Icon name={icon} size={18} color={focus ? TOK.accent : TOK.sub} />
        <input type={type} value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} placeholder={placeholder}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: TOK.sans, fontSize: 15, color: TOK.ink, minWidth: 0 }} />
        {trailing}
      </div>
    </label>
  );
}

function SocialRow({ onPick }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <button onClick={() => onPick('Google')} style={{ flex: 1, height: 50, borderRadius: 14, border: `1.5px solid ${TOK.line}`, background: TOK.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: TOK.sans, fontSize: 14.5, fontWeight: 600, color: TOK.ink }}>
        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 01-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 009 18z"/><path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 010-3.4V5H.9a9 9 0 000 8l3-2.3z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 00.9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"/></svg>
        Google
      </button>
      <button onClick={() => onPick('Apple')} style={{ flex: 1, height: 50, borderRadius: 14, border: `1.5px solid ${TOK.line}`, background: TOK.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: TOK.sans, fontSize: 14.5, fontWeight: 600, color: TOK.ink }}>
        <svg width="16" height="18" viewBox="0 0 16 18"><path fill={TOK.ink} d="M13.2 9.6c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 8 .6 1 1.4 2 2.4 2 1 0 1.3-.6 2.5-.6s1.5.6 2.5.6 1.7-.9 2.3-1.9c.7-1.1 1-2.1 1-2.2 0 0-2-.8-2-3.1zM11.3 3.7c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9 0 1.8-.5 2.3-1.1z"/></svg>
        Apple
      </button>
    </div>
  );
}

function Divider({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
      <div style={{ flex: 1, height: 1, background: TOK.line }} />
      <span style={{ fontFamily: TOK.sans, fontSize: 12, color: TOK.faint }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: TOK.line }} />
    </div>
  );
}

function AuthFlow({ onAuthed }) {
  const [mode, setMode] = React.useState('welcome'); // welcome | login | signup
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);

  const eye = (
    <button onClick={(e) => { e.preventDefault(); setShowPw(s => !s); }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
      <Icon name={showPw ? 'eyeOff' : 'eye'} size={18} color={TOK.sub} />
    </button>
  );

  // ── Welcome ───────────────────────────────────────────────────────
  if (mode === 'welcome') {
    return (
      <div style={{ height: '100%', background: TOK.bg, display: 'flex', flexDirection: 'column' }}>
        {/* editorial hero */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
            <div style={{ width: 46, height: 46, borderRadius: 15, background: TOK.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 4a2 2 0 00-1 3.7c.6.3 1 .8 1 1.5L3.5 14c-1 .6-1.5 1.3-1.5 2 0 1 .9 1.5 2 1.5h16c1.1 0 2-.5 2-1.5 0-.7-.5-1.4-1.5-2L13 9.2" fill="none" stroke="#FBF8F2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily: TOK.serif, fontSize: 21, color: TOK.ink, letterSpacing: -0.2 }}>AwesomeCloset</span>
          </div>
          <div style={{ fontFamily: TOK.serif, fontSize: 44, lineHeight: 1.04, color: TOK.ink, letterSpacing: -0.8 }}>
            Tủ đồ của bạn,<br /><span style={{ fontStyle: 'italic' }}>thông minh</span> hơn.
          </div>
          <p style={{ fontFamily: TOK.sans, fontSize: 15.5, lineHeight: 1.6, color: TOK.sub, margin: '18px 0 0', maxWidth: 300, textWrap: 'pretty' }}>
            Số hóa tủ quần áo, để AI gợi ý outfit hợp thời tiết mỗi sáng. Không còn loay hoay "hôm nay mặc gì".
          </p>
        </div>
        {/* preview strip */}
        <div style={{ display: 'flex', gap: 12, padding: '0 32px 30px', opacity: 0.95 }}>
          {[['tee', '#e7e3da'], ['shirt', '#7d97b5'], ['dress', '#c98b86'], ['sneakers', '#ece8e1']].map(([k, c], i) => (
            <div key={k} style={{ flex: 1, aspectRatio: '3/4', background: TOK.surface, borderRadius: 14, boxShadow: TOK.shadow, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, transform: `translateY(${i % 2 ? 8 : 0}px)` }}>
              <Garment kind={k} color={c} accent={k === 'sneakers' ? '#d8d2c6' : null} />
            </div>
          ))}
        </div>
        {/* actions */}
        <div style={{ padding: '0 28px 40px' }}>
          <PrimaryBtn style={{ width: '100%' }} onClick={() => setMode('signup')}>Tạo tài khoản</PrimaryBtn>
          <button onClick={() => setMode('login')} style={{ width: '100%', height: 50, marginTop: 12, border: 'none', background: 'none', cursor: 'pointer', fontFamily: TOK.sans, fontSize: 14.5, color: TOK.ink, fontWeight: 600 }}>
            Đã có tài khoản? <span style={{ color: TOK.accent }}>Đăng nhập</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Login / Signup form ───────────────────────────────────────────
  const isSignup = mode === 'signup';
  return (
    <div style={{ height: '100%', background: TOK.bg, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ padding: '54px 16px 0' }}>
        <IconBtn name="back" onClick={() => setMode('welcome')} />
      </div>
      <div style={{ padding: '24px 32px 40px' }}>
        <BrandMark />
        <div style={{ fontFamily: TOK.serif, fontSize: 32, color: TOK.ink, letterSpacing: -0.5, marginTop: 22, textAlign: 'center' }}>
          {isSignup ? 'Tạo tài khoản' : <>Chào mừng <span style={{ fontStyle: 'italic' }}>trở lại</span></>}
        </div>
        <p style={{ fontFamily: TOK.sans, fontSize: 14, color: TOK.sub, textAlign: 'center', margin: '8px 0 26px' }}>
          {isSignup ? 'Bắt đầu số hóa tủ đồ của bạn' : 'Đăng nhập để tiếp tục phối đồ'}
        </p>

        {isSignup && <Field icon="user" label="Họ và tên" value={name} onChange={setName} placeholder="Nguyễn Khánh Linh" />}
        <Field icon="mail" label="Email" type="email" value={email} onChange={setEmail} placeholder="ban@email.com" />
        <Field icon="lock" label="Mật khẩu" type={showPw ? 'text' : 'password'} value={pw} onChange={setPw} placeholder="••••••••" trailing={eye} />

        {!isSignup && (
          <div style={{ textAlign: 'right', marginTop: -4, marginBottom: 8 }}>
            <button style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: TOK.sans, fontSize: 13, fontWeight: 600, color: TOK.accent }}>Quên mật khẩu?</button>
          </div>
        )}

        <PrimaryBtn style={{ width: '100%', marginTop: 8 }} onClick={() => onAuthed(isSignup)}>
          {isSignup ? 'Đăng ký' : 'Đăng nhập'}
        </PrimaryBtn>

        {isSignup && (
          <p style={{ fontFamily: TOK.sans, fontSize: 11.5, lineHeight: 1.5, color: TOK.faint, textAlign: 'center', margin: '14px 0 0' }}>
            Khi đăng ký, bạn đồng ý với <span style={{ color: TOK.sub, fontWeight: 600 }}>Điều khoản</span> & <span style={{ color: TOK.sub, fontWeight: 600 }}>Chính sách riêng tư</span>.
          </p>
        )}

        <Divider>hoặc</Divider>
        <SocialRow onPick={() => onAuthed(isSignup)} />

        <div style={{ textAlign: 'center', marginTop: 24, fontFamily: TOK.sans, fontSize: 14, color: TOK.sub }}>
          {isSignup ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
          <button onClick={() => setMode(isSignup ? 'login' : 'signup')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: TOK.sans, fontSize: 14, fontWeight: 700, color: TOK.accent }}>
            {isSignup ? 'Đăng nhập' : 'Đăng ký ngay'}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AuthFlow });
