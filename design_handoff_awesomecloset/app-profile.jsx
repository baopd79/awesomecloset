// app-profile.jsx — Profile / Settings + Saved outfits collection
// Exports (window): ProfileScreen, SavedScreen

function SettingRow({ icon, label, value, onClick, toggle, on, last, danger }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', borderBottom: last ? 'none' : `1px solid ${TOK.line}`, cursor: onClick || toggle ? 'pointer' : 'default' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: danger ? '#F2E0DB' : TOK.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={18} color={danger ? '#B4503C' : TOK.ink2} />
      </div>
      <span style={{ flex: 1, fontFamily: TOK.sans, fontSize: 14.5, fontWeight: 500, color: danger ? '#B4503C' : TOK.ink }}>{label}</span>
      {value && <span style={{ fontFamily: TOK.sans, fontSize: 13.5, color: TOK.sub }}>{value}</span>}
      {toggle
        ? <div onClick={(e) => { e.stopPropagation(); toggle(); }} style={{ width: 46, height: 28, borderRadius: 999, background: on ? TOK.sage : TOK.bg2, padding: 3, display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', transition: 'background .2s', cursor: 'pointer' }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'all .2s' }} />
          </div>
        : (onClick && !value && <Icon name="chevron" size={16} color={TOK.faint} />)}
      {value && onClick && <Icon name="chevron" size={16} color={TOK.faint} />}
    </div>
  );
}

function ProfileScreen() {
  const nav = React.useContext(NavCtx);
  const store = React.useContext(StoreCtx);
  const [notif, setNotif] = React.useState(true);
  const [dark, setDark] = React.useState(false);
  const savedCount = store.savedOutfits.length;
  const archivedCount = store.archivedCount;

  return (
    <div style={{ minHeight: '100%', background: TOK.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '54px 16px 8px' }}>
        <IconBtn name="back" onClick={() => nav.goBack()} />
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: TOK.serif, fontSize: 19, color: TOK.ink }}>Hồ sơ</span>
        <IconBtn name="edit" onClick={() => store.toast('Chỉnh sửa hồ sơ')} iconSize={18} />
      </div>

      {/* identity */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 22px 8px' }}>
        <div style={{ width: 88, height: 88, borderRadius: 999, background: 'linear-gradient(135deg,#D8C7B0,#A2543B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: TOK.serif, fontSize: 36, boxShadow: TOK.shadowLg }}>L</div>
        <div style={{ fontFamily: TOK.serif, fontSize: 26, color: TOK.ink, marginTop: 14, letterSpacing: -0.3 }}>Nguyễn Khánh Linh</div>
        <div style={{ fontFamily: TOK.sans, fontSize: 13, color: TOK.sub, marginTop: 3 }}>linh.nguyen · Thành viên từ T3 2026</div>
      </div>

      {/* quick stats */}
      <div style={{ display: 'flex', gap: 10, padding: '18px 16px 6px' }}>
        {[[String(store.closet.length), 'món'], ['128', 'outfit'], ['7', 'streak']].map(([n, l]) => (
          <SoftCard key={l} pad={14} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: TOK.serif, fontSize: 24, color: TOK.ink }}>{n}</div>
            <Kicker style={{ marginTop: 2 }}>{l}</Kicker>
          </SoftCard>
        ))}
      </div>

      {/* collection */}
      <div style={{ padding: '22px 22px 10px' }}><Kicker>Bộ sưu tập</Kicker></div>
      <SoftCard style={{ margin: '0 16px' }}>
        <SettingRow icon="heart" label="Outfit đã lưu" value={savedCount > 0 ? `${savedCount}` : 'Trống'} onClick={() => nav.navigate('saved')} />
        <SettingRow icon="archive" label="Đồ đã lưu trữ" value={archivedCount > 0 ? `${archivedCount}` : '0'} onClick={() => nav.navigate('archive')} last />
      </SoftCard>

      {/* settings */}
      <div style={{ padding: '22px 22px 10px' }}><Kicker>Cài đặt</Kicker></div>
      <SoftCard style={{ margin: '0 16px' }}>
        <SettingRow icon="bell" label="Thông báo gợi ý sáng" toggle={() => setNotif(v => !v)} on={notif} />
        <SettingRow icon="loc" label="Vị trí thời tiết" value={WEATHER.city} onClick={() => store.toast('Đổi vị trí thời tiết')} />
        <SettingRow icon="moon" label="Giao diện tối" toggle={() => { setDark(v => !v); store.toast('Sắp ra mắt'); }} on={dark} />
        <SettingRow icon="palette" label="Tùy chỉnh giao diện" onClick={() => nav.navigate('appearance')} />
        <SettingRow icon="shield" label="Quyền riêng tư & dữ liệu" onClick={() => store.toast('Quyền riêng tư')} />
        <SettingRow icon="help" label="Trợ giúp & phản hồi" onClick={() => store.toast('Gửi phản hồi')} last />
      </SoftCard>

      <div style={{ padding: '20px 16px 0' }}>
        <SoftCard>
          <SettingRow icon="logout" label="Đăng xuất" danger onClick={() => store.logout()} last />
        </SoftCard>
      </div>
      <div style={{ textAlign: 'center', fontFamily: TOK.sans, fontSize: 11.5, color: TOK.faint, padding: '22px 0 30px' }}>AwesomeCloset · phiên bản 1.0</div>
    </div>
  );
}

function SavedScreen() {
  const nav = React.useContext(NavCtx);
  const store = React.useContext(StoreCtx);
  const saved = OUTFITS.filter(o => store.savedOutfits.includes(o.id));

  return (
    <div style={{ minHeight: '100%', background: TOK.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '54px 16px 8px' }}>
        <IconBtn name="back" onClick={() => nav.goBack()} />
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: TOK.serif, fontSize: 19, color: TOK.ink }}>Outfit đã lưu</span>
        <div style={{ width: 42 }} />
      </div>

      {saved.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '70px 40px' }}>
          <div style={{ width: 76, height: 76, borderRadius: 999, background: TOK.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="heart" size={34} color={TOK.accent} />
          </div>
          <div style={{ fontFamily: TOK.serif, fontSize: 23, color: TOK.ink, marginTop: 20 }}>Chưa lưu outfit nào</div>
          <p style={{ fontFamily: TOK.sans, fontSize: 14, lineHeight: 1.55, color: TOK.sub, margin: '8px 0 24px', textWrap: 'pretty' }}>Nhấn vào biểu tượng trái tim ở bất kỳ gợi ý nào để lưu lại xem sau.</p>
          <PrimaryBtn icon="spark" onClick={() => { nav.goBack(); nav.navigate('suggest'); }}>Xem gợi ý outfit</PrimaryBtn>
        </div>
      ) : (
        <div style={{ padding: '12px 16px 30px' }}>
          <div style={{ fontFamily: TOK.sans, fontSize: 13, color: TOK.sub, padding: '0 6px 14px' }}>{saved.length} outfit bạn đã lưu</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {saved.map(o => (
              <div key={o.id} onClick={() => nav.navigate('outfit', { id: o.id })} style={{ cursor: 'pointer' }}>
                <SoftCard>
                  <div style={{ display: 'flex', gap: 0 }}>
                    <div style={{ width: 150, flexShrink: 0 }}><Collage ids={o.items} height={150} radius={0} pad={10} /></div>
                    <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, background: TOK.sageSoft, color: TOK.sage, fontFamily: TOK.sans, fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>{o.occ}</span>
                      <div style={{ fontFamily: TOK.serif, fontSize: 19, color: TOK.ink, marginTop: 8, lineHeight: 1.15 }}>{o.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, color: TOK.accent }}>
                        <span style={{ fontFamily: TOK.sans, fontSize: 12.5, fontWeight: 600 }}>Xem chi tiết</span>
                        <Icon name="chevron" size={14} color={TOK.accent} />
                      </div>
                    </div>
                  </div>
                </SoftCard>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ProfileScreen, SavedScreen });
