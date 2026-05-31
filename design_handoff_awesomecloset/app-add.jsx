// app-add.jsx — Capture / batch upload with simulated processing pipeline
// Statuses per SPEC: pending → removing_bg → tagging → ready (+ failed → retry)
// Exports (window): AddScreen

const STEPS = [
  { key: 'pending', label: 'Đang tải lên', p: 0.18 },
  { key: 'removing_bg', label: 'Đang tách nền', p: 0.48 },
  { key: 'tagging', label: 'AI đang gắn thẻ', p: 0.8 },
  { key: 'ready', label: 'Hoàn tất', p: 1 },
];
const NEW_POOL = [
  { kind: 'tee', color: '#cdd6d0', name: 'Áo thun mới' },
  { kind: 'shirt', color: '#c9b79a', name: 'Sơ mi mới' },
  { kind: 'jeans', color: '#46506b', name: 'Quần jeans mới' },
  { kind: 'sweater', color: '#a8889a', name: 'Áo len mới' },
  { kind: 'sneakers', color: '#e6e1d8', accent: '#cfc8ba', name: 'Giày mới' },
  { kind: 'dress', color: '#b9a0ab', name: 'Đầm mới' },
];
let _uid = 1000;

function StatusRow({ q, onRetry }) {
  const done = q.status === 'ready';
  const failed = q.status === 'failed';
  const step = STEPS.find(s => s.key === q.status) || STEPS[0];
  return (
    <SoftCard pad={12} style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 10 }}>
      <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', background: TOK.ground, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 9, flexShrink: 0, position: 'relative' }}>
        <Garment kind={q.kind} color={q.color} accent={q.accent} />
        {done && <div style={{ position: 'absolute', inset: 0, borderRadius: 'var(--radius-sm)', background: 'rgba(95,126,100,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 26, height: 26, borderRadius: 999, background: TOK.sage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={16} color="#fff" sw={2.6}/></div></div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: TOK.sans, fontSize: 13.5, fontWeight: 600, color: TOK.ink }}>{done ? q.name : (failed ? 'Tách nền thất bại' : q.name)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
          {failed
            ? <span style={{ fontFamily: TOK.sans, fontSize: 12, color: '#B4503C', fontWeight: 600 }}>Ảnh nền phức tạp — thử lại?</span>
            : <>
                <div style={{ flex: 1, maxWidth: 140 }}><Bar value={step.p} color={done ? TOK.sage : TOK.accent} h={6} /></div>
                <span style={{ fontFamily: TOK.sans, fontSize: 11.5, color: done ? TOK.sage : TOK.sub, fontWeight: 600, whiteSpace: 'nowrap' }}>{step.label}</span>
              </>}
        </div>
      </div>
      {failed && <button onClick={() => onRetry(q.id)} style={{ border: 'none', background: TOK.accentSoft, color: TOK.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 999, fontFamily: TOK.sans, fontSize: 12.5, fontWeight: 600 }}><Icon name="retry" size={14} color={TOK.accent}/>Thử lại</button>}
    </SoftCard>
  );
}

function AddScreen() {
  const store = React.useContext(StoreCtx);
  const [queue, setQueue] = React.useState([
    { id: 901, kind: 'jacket', color: '#3f4a40', name: 'Áo khoác mới', status: 'tagging' },
    { id: 902, kind: 'pants', color: '#37373a', name: 'Quần tây mới', status: 'failed' },
  ]);
  const [perm, setPerm] = React.useState(false);
  const [pendingN, setPendingN] = React.useState(null);

  // pipeline ticker
  React.useEffect(() => {
    const t = setInterval(() => {
      setQueue(prev => prev.map(q => {
        if (q.status === 'ready' || q.status === 'failed') return q;
        const idx = STEPS.findIndex(s => s.key === q.status);
        const next = STEPS[idx + 1];
        if (next) { if (next.key === 'ready') store.onProcessed(); return { ...q, status: next.key }; }
        return q;
      }));
    }, 1400);
    return () => clearInterval(t);
  }, []);

  const addBatch = (n) => {
    const adds = Array.from({ length: n }, () => { const p = NEW_POOL[Math.floor(Math.random() * NEW_POOL.length)]; return { ...p, id: ++_uid, status: 'pending' }; });
    setQueue(prev => [...adds, ...prev]);
    store.toast(n === 1 ? 'Đã thêm 1 ảnh — đang xử lý' : `Đã thêm ${n} ảnh — đang xử lý`);
  };
  // Permission priming: chỉ xin quyền khi user bắt đầu upload (SPEC 3.10)
  const guard = (n, src) => { if (!perm) { setPendingN({ n, src }); } else { addBatch(n); } };
  const grant = () => { setPerm(true); const p = pendingN; setPendingN(null); if (p) setTimeout(() => addBatch(p.n), 250); };
  const retry = (id) => setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'pending' } : q));

  const processing = queue.filter(q => q.status !== 'ready');
  const doneCount = queue.filter(q => q.status === 'ready').length;

  return (
    <div style={{ minHeight: '100%', paddingTop: 50 }}>
      <div style={{ padding: '6px 22px 4px' }}>
        <Kicker>Bước 1 · Chụp → AI gắn thẻ → Mặc</Kicker>
        <div style={{ fontFamily: TOK.serif, fontSize: 34, color: TOK.ink, letterSpacing: -0.5, marginTop: 6 }}>Thêm đồ</div>
      </div>

      {/* viewfinder */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ borderRadius: TOK.r, overflow: 'hidden', position: 'relative', background: 'linear-gradient(160deg,#EEE8DB,#E3DACB)', boxShadow: TOK.shadow }}>
          <div style={{ height: 230, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* guide frame */}
            <div style={{ position: 'absolute', inset: 24, borderRadius: 18, border: `2px dashed rgba(30,27,22,0.22)` }} />
            {[[16,16,'tl'],[16,16,'tr'],[16,16,'bl'],[16,16,'br']].map((c,i) => {
              const pos = ['tl','tr','bl','br'][i];
              const s = { position: 'absolute', width: 22, height: 22, borderColor: TOK.ink, borderStyle: 'solid', borderWidth: 0 };
              if (pos[0]==='t') { s.top = 18; s.borderTopWidth = 3; } else { s.bottom = 18; s.borderBottomWidth = 3; }
              if (pos[1]==='l') { s.left = 18; s.borderLeftWidth = 3; s.borderTopLeftRadius = pos[0]==='t'?10:0; s.borderBottomLeftRadius = pos[0]==='b'?10:0; } else { s.right = 18; s.borderRightWidth = 3; s.borderTopRightRadius = pos[0]==='t'?10:0; s.borderBottomRightRadius = pos[0]==='b'?10:0; }
              return <div key={i} style={s} />;
            })}
            <div style={{ opacity: 0.5, transform: 'scale(0.85)' }}><Garment kind="tee" color="#cfc7b8" /></div>
            <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(30,27,22,0.7)', padding: '6px 12px', borderRadius: 999 }}>
              <Icon name="sun" size={13} color="#F0D9A8"/><span style={{ fontFamily: TOK.sans, fontSize: 11, color: '#FBF8F2', fontWeight: 500 }}>Chụp trên nền sáng, mỗi ảnh một món</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <GhostBtn icon="gallery" style={{ flex: 1 }} onClick={() => guard(3, 'gallery')}>Thư viện</GhostBtn>
          <button onClick={() => guard(1, 'camera')} style={{ width: 66, height: 66, borderRadius: 999, border: `4px solid ${TOK.ink}`, background: TOK.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: TOK.shadow }}>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: TOK.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="camera" size={22} color="#FBF8F2"/></div>
          </button>
          <GhostBtn icon="spark" style={{ flex: 1 }} onClick={() => guard(5, 'gallery')}>Nhiều ảnh</GhostBtn>
        </div>
      </div>

      {/* queue */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '26px 22px 12px' }}>
        <span style={{ fontFamily: TOK.serif, fontSize: 20, color: TOK.ink }}>Hàng đợi xử lý</span>
        {doneCount > 0 && <span style={{ fontFamily: TOK.sans, fontSize: 12.5, color: TOK.sage, fontWeight: 600 }}>{doneCount} đã xong</span>}
      </div>
      <div style={{ padding: '0 16px' }}>
        {queue.map(q => <StatusRow key={q.id} q={q} onRetry={retry} />)}
        {queue.length === 0 && <div style={{ textAlign: 'center', padding: '20px', fontFamily: TOK.sans, fontSize: 13.5, color: TOK.sub }}>Chưa có ảnh nào trong hàng đợi</div>}
      </div>
      <div style={{ height: 100 }} />

      <Sheet open={!!pendingN} onClose={() => setPendingN(null)} title={pendingN && pendingN.src === 'camera' ? 'Cho phép dùng Camera' : 'Cho phép truy cập ảnh'}>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 16px' }}>
          <div style={{ width: 72, height: 72, borderRadius: 999, background: TOK.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={pendingN && pendingN.src === 'camera' ? 'camera' : 'gallery'} size={32} color={TOK.accent} />
          </div>
        </div>
        <p style={{ fontFamily: TOK.sans, fontSize: 14, lineHeight: 1.55, color: TOK.sub, textAlign: 'center', margin: '0 0 8px', textWrap: 'pretty' }}>
          AwesomeCloset cần quyền {pendingN && pendingN.src === 'camera' ? 'mở camera để chụp' : 'truy cập thư viện để chọn'} ảnh quần áo. Ảnh của bạn được lưu <b style={{ color: TOK.ink }}>riêng tư</b>, chỉ bạn xem được.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', margin: '14px 0 18px', color: TOK.sage }}>
          <Icon name="shield" size={16} color={TOK.sage} /><span style={{ fontFamily: TOK.sans, fontSize: 12.5, fontWeight: 600 }}>Không chia sẻ công khai · có thể thu hồi bất kỳ lúc nào</span>
        </div>
        <PrimaryBtn style={{ width: '100%' }} onClick={grant}>Cho phép</PrimaryBtn>
        <button onClick={() => setPendingN(null)} style={{ width: '100%', height: 46, marginTop: 8, border: 'none', background: 'none', cursor: 'pointer', fontFamily: TOK.sans, fontSize: 14, fontWeight: 600, color: TOK.sub }}>Để sau</button>
      </Sheet>
    </div>
  );
}

Object.assign(window, { AddScreen });
