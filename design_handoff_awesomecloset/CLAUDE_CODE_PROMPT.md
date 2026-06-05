# Câu lệnh cho Claude Code — AwesomeCloset (khớp PLAN.md)

Gói thiết kế này là **nguồn chân lý về giao diện**. Nó KHÔNG thay PLAN.md — mà bổ trợ: mỗi task mobile trong `docs/PLAN.md` lấy màn tương ứng ở đây làm chuẩn pixel.

> **Tech stack (theo PLAN):** Expo + **Expo Router** (file-based routing) · TypeScript strict (không `any`) · Supabase · FastAPI · Gemini · ARQ/Redis.
> **Quy trình (theo PLAN):** 1 task = 1 branch = 1 PR. Claude Code KHÔNG tự push — bạn review diff rồi merge PR. CI phải pass.

---

## Bảng map: màn thiết kế ↔ task mobile trong PLAN

| Task PLAN | Branch | Màn trong gói (file tham chiếu) |
|---|---|---|
| **Task 6** — Auth + Navigation | `feat/6-mobile-auth` | Auth (`app-auth.jsx`) + tab bar + **theme** (`app-core.jsx`) |
| **Task 7** — Upload Flow | `feat/7-mobile-upload` | Add (`app-add.jsx`) |
| **Task 10** — Closet UI | `feat/10-closet-ui` | Closet + Item (`app-closet.jsx`) |
| **Task 15** — Home + Outfit UI | `feat/15-suggest-ui` | Home (`app-home.jsx`), Suggest + Outfit (`app-outfit.jsx`) |
| **Builder thủ công** (POST/PATCH /api/outfits) | theo task outfit tương ứng PLAN | `app-builder.jsx` — role-based slots |
| **Task 16** — Analytics UI | `feat/16-analytics` | Analytics (`app-analytics.jsx`) |
| **Task 17** — Gamification + Onboarding | `feat/17-gamification` | Onboarding (`app-onboarding.jsx`) + gate/streak ở Home |
| *(bonus, chưa có task riêng)* | — | Profile/Saved/Archive/Appearance (`app-profile.jsx`, `app-settings.jsx`) |

---

## Bối cảnh chung — dán đầu mỗi phiên Claude Code
```
Dự án AwesomeCloset (app tủ đồ AI). Nguồn chân lý:
- docs/PLAN.md — task, acceptance criteria, file paths, quy trình branch/PR.
- docs/SPEC.md — dữ liệu, API contract, taxonomy ENUM (tiếng Anh, vd type=t_shirt, occasion=work).
- design_handoff_awesomecloset/README.md — GIAO DIỆN (layout, tokens, copy).
Các file .jsx trong design_handoff là prototype React WEB, chỉ để tham chiếu chi tiết — dịch sang React Native (<View>/<Text>/StyleSheet) + Expo Router, KHÔNG copy thẳng. Bỏ qua ios-frame.jsx.
Nhãn tiếng Việt trong thiết kế chỉ là TEXT HIỂN THỊ; giá trị lưu DB dùng enum tiếng Anh trong SPEC (vd enum 'work' → hiển thị "Đi làm").
Quy tắc: 1 task = 1 branch = 1 PR, KHÔNG tự push — tôi review rồi merge. TypeScript strict, không 'any'.
```

---

## Task 6 — Auth + Navigation (+ Theme foundation)
> Gộp thêm theme vào đây vì mọi màn sau đều phụ thuộc.
```
Bắt đầu Task 6 theo docs/PLAN.md (branch feat/6-mobile-auth).
Tham chiếu: design_handoff_awesomecloset/README.md + app-auth.jsx + app-core.jsx.

1. THEME — port mục "Design Tokens" (README) + hàm buildVars (app-core.jsx) thành mobile/theme/:
   - ThemeProvider (Context) sinh token từ { accent, paper, corners, serifHeads }.
   - Mặc định production: accent #A2543B (Nâu đất), paper "Trung tính", corners "Mềm", serifHeads true.
   - Hỗ trợ đổi runtime (cho màn Appearance ở Task sau). Export useTheme().
   - Port primitive sang RN: Kicker, SoftCard, Pill, PrimaryBtn, GhostBtn, IconBtn, Bar, Stars, BottomSheet, Toast, Icon (react-native-svg, lift path từ object PATHS trong app-core.jsx).
   - Load font Playfair Display + Be Vietnam Pro qua @expo-google-fonts.

2. AUTH — mobile/app/(auth)/login.tsx + register.tsx bám visual app-auth.jsx:
   - Welcome → Login/Register; BrandMark (logo móc treo), Field (icon trái, viền focus accent), SocialRow (Google/Apple), nút 👁 ẩn/hiện mật khẩu.
   - Nối Supabase Auth (email/password) qua mobile/lib/supabase.ts.

3. NAV — mobile/app/(tabs)/ với bottom tab bar 4 mục (Hôm nay/Tủ đồ/+ Thêm/Thống kê), nút + nổi ở giữa, style theo TabBar trong file gốc.
   - Luồng: login → (tabs); register → onboarding (stub màn trống, full ở Task 17) → (tabs); logout → (auth)/login.

Đáp ứng acceptance criteria Task 6 trong PLAN. npx tsc --noEmit phải sạch. Đừng push.
```

## Task 7 — Upload Flow
```
Task 7 theo PLAN (branch feat/7-mobile-upload). Tham chiếu app-add.jsx + mục "Add" trong README.
Dựng mobile/app/(tabs)/add.tsx bám visual: viewfinder + khung guide, hàng nút Thư viện/shutter/Nhiều ảnh.
- Permission priming: chỉ xin quyền Camera/Thư viện khi user bấm lần đầu (BottomSheet theo thiết kế).
- UploadQueue + ItemProcessingCard: trạng thái uploading→removing_bg→tagging→ready/failed, progress bar + nhãn, nút Thử lại khi failed.
- Subscribe Supabase Realtime để update status (useRealtimeItem). Batch tối đa 10 ảnh.
Đáp ứng acceptance criteria Task 7. Đừng push.
```

## Task 10 — Closet UI
```
Task 10 theo PLAN (branch feat/10-closet-ui). Tham chiếu app-closet.jsx + mục "Closet"/"Item" trong README.
- closet.tsx: grid 2-3 cột (masonry so le), filter chips (type/occasion/season), search. Ảnh processed_url trên nền ground. Badge "CHƯA MẶC". Empty/loading(skeleton)/error(retry) states per item.
- item/[id].tsx: hero ảnh, Màu sắc (nhiều swatch), thẻ AI (loại·dịp·mùa·phong cách) + sửa qua BottomSheet, lịch sử mặc, nút "Cải thiện tách nền", "Phối đồ với món này".
- Swipe trái → archive.
Map nhãn hiển thị ↔ enum SPEC. Đáp ứng acceptance criteria Task 10. Đừng push.
```

## Task 15 — Home + Outfit UI
```
Task 15 theo PLAN (branch feat/15-suggest-ui). Tham chiếu app-home.jsx + app-outfit.jsx + README.
- (tabs)/index.tsx (Home): header + lời chào serif, WeatherBadge, StreakBadge, occasion selector, nút "Gợi ý hôm nay". Location permission xin khi bấm lần đầu, fallback manual.
- GATE: nếu items_count < 15 (từ 403 CLOSET_NOT_READY) → SuggestionGateProgress thay vì gợi ý.
- Suggest flow 3 phase (context→gen→results) theo SuggestScreen.
- outfit/[id].tsx: collage + card "VÌ SAO AI CHỌN" + danh sách món + Lưu/Chia sẻ collage + Save/Mặc hôm nay(→wear)/Dislike + đánh giá sao.
Đáp ứng acceptance criteria Task 15. Đừng push.
```

## Task 16 — Analytics UI
```
Task 16 theo PLAN (branch feat/16-analytics). Tham chiếu app-analytics.jsx + README.
(tabs)/analytics.tsx: 3 thẻ tóm tắt + bar chart màu (top 5) + grid đồ chưa mặc + calendar view (ô ngày tô màu theo dịp). Dữ liệu từ /api/analytics/*.
Đáp ứng acceptance criteria Task 16. Đừng push.
```

## Task 17 — Gamification + Onboarding
```
Task 17 theo PLAN (branch feat/17-gamification). Tham chiếu app-onboarding.jsx + README.
- OnboardingSlides: 3 slide (Chụp → AI tag → Mặc đẹp) theo thiết kế, chỉ show lần đầu (AsyncStorage flag).
- Progress bar gate {items_count}/15 trên Home (dùng items_count từ API, không thêm logic mới).
- StreakBadge + badge "Tủ đồ đầu tiên" khi đạt 15 món lần đầu.
Đáp ứng acceptance criteria Task 17. Đừng push.
```

## Bonus (khi muốn): Profile / Saved / Archive / Appearance
```
PLAN chưa có task riêng cho các màn này. Khi cần, dựng theo app-profile.jsx + app-settings.jsx:
Profile (hồ sơ + settings), Saved (outfit đã lưu), Archive (đồ lưu trữ + khôi phục), Appearance (đổi theme runtime qua ThemeProvider đã dựng ở Task 6).
```

---

## Nguyên tắc làm việc
- **1 task / 1 phiên**, theo đúng thứ tự PLAN. Review diff → bạn merge PR → CI pass.
- Luôn nhắc Claude Code đọc **PLAN + SPEC + README handoff** trước khi code.
- Pixel chưa khớp → chỉ nó mở đúng file `.jsx` tương ứng.
- Open Question của PLAN về collage: **đã chốt = lưới flat-lay** (xem `Collage` trong `app-extras.jsx`).
