# Handoff: AwesomeCloset — Ứng dụng tủ đồ AI (MVP UI)

## Overview
AwesomeCloset là ứng dụng di động giúp người dùng (sinh viên / người đi làm 18–35 tuổi tại Việt Nam) **số hóa tủ quần áo** và nhận **gợi ý outfit bằng AI** theo thời tiết + hoàn cảnh, để không còn loay hoay "sáng nay mặc gì".

Gói này chứa **prototype giao diện hi-fi** cho toàn bộ màn hình MVP, theo hệ thiết kế **"Warm Editorial Soft"** (sang trọng kiểu tạp chí × mềm mại thân thiện). Mục tiêu của gói: cung cấp đủ thông tin để lập trình viên **dựng lại giao diện này trong app thật**.

---

## About the Design Files
Các file trong gói (`AwesomeCloset - Prototype.html` + các `*.jsx`) là **bản tham chiếu thiết kế được tạo bằng HTML/React-web + Babel chạy trong trình duyệt**. Chúng thể hiện **hình thức và hành vi mong muốn**, KHÔNG phải code production để copy thẳng.

> **Tech stack đích (theo SPEC):** React Native (Expo) cho mobile · FastAPI (Python) cho backend · Supabase (Postgres + Auth + Storage) · Google Gemini Flash cho AI tagging & gợi ý.

Nhiệm vụ: **tái dựng các màn hình HTML này sang React Native/Expo**, dùng component gốc (`<View>`, `<Text>`, `<Image>`, `<Pressable>`, `<FlatList>`…) + `StyleSheet`, thay vì copy `<div>`/CSS. Toàn bộ giá trị thiết kế (màu, font, spacing, bo góc, shadow) đã được trích sẵn trong mục **Design Tokens** bên dưới để cắm thẳng vào theme.

---

## Fidelity
**High-fidelity (hi-fi).** Đây là mockup gần pixel-perfect: màu, typography, spacing, bo góc, shadow và phần lớn interaction đều là giá trị cuối. Hãy dựng lại **bám sát** các giá trị trong tài liệu này.

Lưu ý về dữ liệu & ảnh:
- Quần áo trong prototype là **minh họa SVG flat-lay vẽ tay** (mô phỏng ảnh đã tách nền). App thật sẽ dùng **ảnh người dùng chụp + tách nền** lưu trên Supabase Storage.
- Mọi dữ liệu (tủ đồ, outfit, thống kê, thời tiết 24°C…) là **mock**. Thay bằng dữ liệu thật từ API.
- Các thao tác AI (tách nền, gắn thẻ, gợi ý) hiện **mô phỏng bằng setTimeout**. Thay bằng gọi backend thật.

---

## Screens / Views

Điều hướng tổng thể: **Auth → (nếu đăng ký) Onboarding → App chính**. App chính có **bottom tab bar** 4 mục: Hôm nay (Home) · Tủ đồ (Closet) · nút **+** ở giữa (Thêm) · Thống kê (Analytics). Các màn còn lại (Item, Outfit, Suggest, Profile, Saved, Archive, Appearance) là **màn đẩy chồng (push)** có nút back, ẩn tab bar.

### 1. Auth — Chào mừng / Đăng nhập / Đăng ký  `app-auth.jsx`
- **Mục đích:** Xác thực người dùng.
- **Welcome:** Logo móc treo (ô vuông đen bo 15px, icon hanger trắng) + wordmark "AwesomeCloset" (serif 21px). Tiêu đề serif 44px "Tủ đồ của bạn, *thông minh* hơn." (từ "thông minh" in nghiêng italic). Đoạn mô tả sans 15.5px màu `sub`. Dải 4 ảnh preview quần áo (card surface bo 14, lệch so le translateY). Nút chính "Tạo tài khoản" (PrimaryBtn), link "Đã có tài khoản? **Đăng nhập**".
- **Login/Signup:** BrandMark giữa, tiêu đề serif 32px. Các `Field` (label sans 12px 600 + ô input surface bo 14, viền focus = accent, icon trái). Signup có thêm field Họ tên + dòng điều khoản 11.5px. Login có "Quên mật khẩu?". Nút submit PrimaryBtn full-width. `Divider` "hoặc". `SocialRow`: 2 nút Google / Apple (viền line, logo SVG). Link chuyển đổi login↔signup ở cuối.
- **Hành vi:** Đăng nhập → vào thẳng app. Đăng ký → qua Onboarding trước. Nút 👁 ẩn/hiện mật khẩu.

### 2. Onboarding (3 bước)  `app-onboarding.jsx`
- **Mục đích:** Giới thiệu core loop cho người mới.
- 3 slide, mỗi slide: vùng hero minh họa (giữa) + khối text dưới (Kicker "Bước 0X" + tiêu đề serif 38px có 1 từ italic + body sans 15px). Hàng dưới cùng: dots chỉ báo (dot active rộng 24px màu accent) + PrimaryBtn "Tiếp tục" / "Bắt đầu".
  - **B1 "Chụp tủ đồ":** 3 card quần áo xoay nhẹ ±6°.
  - **B2 "AI tự gắn thẻ":** 1 card áo sơ mi + 4 chip tag nổi quanh (xen kẽ accentSoft/sageSoft).
  - **B3 "Mặc đẹp mỗi sáng":** 1 card outfit (collage + chip dịp + tên serif).
- Nút "Bỏ qua" góc trên phải (trừ slide cuối).

### 3. Home / Hôm nay  `app-home.jsx`
- **Mục đích:** Màn chính buổi sáng — chào, thời tiết, streak, gợi ý outfit hôm nay.
- **Header:** Kicker "Thứ Bảy · 31.05 · Hồ Chí Minh" + lời chào serif 33px ("Chào buổi sáng, *Linh*"). Avatar tròn 46px gradient (bấm → Profile).
- **WeatherStrip:** Nhiệt độ serif 56px ("24°") + icon mặt trời + mô tả + dòng "Cao 29° · Thấp 23° · Mưa rào chiều 40%".
- **StreakCard:** SoftCard — "7 ngày liên tiếp" (serif 30) + 7 ô ngày (T2–CN), ô đã hoàn thành = nền accent + dấu check trắng.
- **Gợi ý hôm nay:**
  - **Nếu tủ < 15 món →** `LockedGate`: card khóa với progress bar "Thêm X món nữa", nút "Thêm đồ vào tủ". *(Đây là cơ chế gamification gate — xem State.)*
  - **Nếu ≥ 15 món →** `SuggestionHero`: card lớn (collage 210px + chip dịp sage + tên serif 25 + lý do AI + nút "Mặc hôm nay" / tim lưu) + carousel "Thêm lựa chọn" (mini outfit 200px) + ô "Gợi ý theo dịp khác" (viền dashed).

### 4. Closet / Tủ đồ  `app-closet.jsx` → `ClosetScreen`
- **Mục đích:** Duyệt toàn bộ tủ đồ số.
- Header: Kicker "48 món · 6 nhóm" + tiêu đề serif 34 "Tủ đồ" + nút filter.
- **Search bar** (bo tròn 999, icon kính lúp, viền focus accent, nút xóa khi có text).
- **Filter pills** (ngang, cuộn): Tất cả / Áo / Quần & Váy / Giày / Phụ kiện — pill active nền `ink` chữ trắng.
- **Masonry grid 2 cột** (CSS `columns`, độ cao card so le): mỗi card = ảnh trên nền `ground` + badge "CHƯA MẶC" (góc trái, accentSoft) nếu worn=0 + tên serif 15.5 + chấm màu + dịp. Bấm card → Item.
- Empty state khi lọc rỗng.

### 5. Item detail  `app-closet.jsx` → `ItemScreen`
- Hero nền `ground` (paddingTop 54, ảnh 270px) + nút back / archive.
- Thông tin: Kicker "loại · mùa" + tên serif 28 + dòng "Đã mặc N lần".
- Nút **"Cải thiện tách nền"** (fallback Remove.bg — có spinner khi xử lý).
- **Màu sắc:** nhiều `TagChip` có swatch (màu chủ đạo + màu phụ).
- **Thẻ gắn (AI):** TagChip loại · dịp · mùa · phong cách, nút "Sửa" → bottom Sheet chọn lại Phong cách / Mùa / Dịp.
- **Lịch sử mặc:** list hoặc empty state "Món này còn ngủ quên".
- PrimaryBtn "Phối đồ với món này" → Suggest.

### 6. Add / Thêm đồ  `app-add.jsx`
- **Mục đích:** Chụp/chọn ảnh → pipeline xử lý.
- **Viewfinder** (gradient + khung guide dashed + 4 góc ngắm + tip "Chụp trên nền sáng, mỗi ảnh một món").
- Hàng nút: "Thư viện" (GhostBtn) · nút shutter tròn 66px viền ink · "Nhiều ảnh".
- **Permission priming:** Lần đầu bấm chụp/chọn → bottom Sheet xin quyền (phân biệt Camera vs Thư viện, nhấn mạnh ảnh riêng tư, nút "Cho phép" / "Để sau"). Cấp xong tự thêm ảnh vào hàng đợi.
- **Hàng đợi xử lý** (`StatusRow`): mỗi ảnh chạy qua trạng thái `pending → removing_bg → tagging → ready`, có progress bar + nhãn ("Đang tải lên / Đang tách nền / AI đang gắn thẻ / Hoàn tất"). Trạng thái `failed` → hiện "Tách nền thất bại" + nút **Thử lại**. Item `ready` đủ 15 → mở khóa gate ở Home.

### 7. Suggest (luồng gợi ý)  `app-outfit.jsx` → `SuggestScreen`
- 3 phase: **context** (chọn Hoàn cảnh dạng grid 2 cột 6 dịp + Thời tiết dạng pills) → **gen** (spinner accent + 4 dòng tiến trình "Đọc thời tiết… / Quét tủ… / Phối theo dịp… / Hoàn thiện collage…") → **results** (2–3 card outfit, số thứ tự 01/02/03 overlay, tên serif + lý do; nút "Đổi hoàn cảnh & tạo lại").

### 8. Outfit detail  `app-outfit.jsx` → `OutfitScreen`
- Hero collage 250px nền `ground` + back / tim lưu.
- Chip dịp sage + tên serif 28.
- **Card "VÌ SAO AI CHỌN"** (nền accentSoft, icon spark, lý do).
- Chip thời tiết + vị trí.
- **Danh sách món** (mỗi món có thumbnail + tên + vai trò, bấm → Item).
- **Bảng phối (collage):** preview + nút **tải về máy** + nút **chia sẻ**.
- Nút "Mặc hôm nay" → Sheet đánh giá sao (feedback cho AI) · nút dislike (ẩn gợi ý).

### 9. Analytics / Thống kê  `app-analytics.jsx`
- Header serif 34 + 3 thẻ tóm tắt (món / outfit / ngày mặc).
- **Màu mặc nhiều nhất:** 6 dòng có swatch + thanh bar tỉ lệ.
- **Đồ chưa mặc:** carousel ngang các món worn=0 (badge "CHƯA MẶC").
- **Lịch outfit tháng:** grid 7 cột, ô ngày tô màu theo dịp (Đi học = xanh rêu, Đi làm = navy, Đi chơi = nâu đất, Hẹn hò = hồng) + chú thích.

### 10. Profile + Settings  `app-profile.jsx`
- Avatar 88px gradient + tên serif 26 + dòng thành viên.
- 3 thẻ thống kê nhanh.
- **Bộ sưu tập:** "Outfit đã lưu" → Saved · "Đồ đã lưu trữ" → Archive.
- **Cài đặt** (`SettingRow`): Thông báo (toggle) · Vị trí thời tiết · Giao diện tối (toggle) · **Tùy chỉnh giao diện** → Appearance · Quyền riêng tư · Trợ giúp.
- **Đăng xuất** (đỏ) → về màn Auth.

### 11. Saved — Outfit đã lưu  `app-profile.jsx` → `SavedScreen`
- Empty state (icon tim, mô tả, nút "Xem gợi ý") hoặc list card outfit ngang (collage 150 + chip dịp + tên + "Xem chi tiết").

### 12. Archive — Đồ đã lưu trữ  `app-settings.jsx` → `ArchiveScreen`
- Empty state hoặc list món đã ẩn (thumbnail mờ + tên + nút **Khôi phục** → đưa lại vào tủ).

### 13. Appearance — Tùy chỉnh giao diện  `app-settings.jsx` → `AppearanceScreen`
- **Tính năng thật cho người dùng cuối** (không phải công cụ dev).
- Preview outfit card trực tiếp ở đầu.
- Chọn **Tông nhấn** (Nâu đất / Xanh rêu / Than chì / Mận khô) · **Tông giấy nền** (Ấm / Trung tính / Sáng) · **Độ bo góc** (Mềm / Vừa / Sắc) · toggle **chữ serif tiêu đề**. Đổi → áp dụng ngay toàn app.

---

## Interactions & Behavior
- **Điều hướng:** tab (Home/Closet/Add/Analytics) reset stack; màn chi tiết là push có back. Animation: màn push `slideIn` (translateX 34→0, .3s cubic-bezier(.2,.8,.2,1)); chuyển tab `fadeIn` (translateY 7→0, .25s). **Lưu ý:** animation chỉ dùng `transform`, KHÔNG dùng opacity 0 (xem Notes).
- **Bottom Sheet:** trượt từ dưới lên (translateY 110%→0, .34s), backdrop mờ rgba(30,27,22,.4). Dùng cho: sửa thẻ, xin quyền, đánh giá outfit.
- **Toast:** hiện giữa-dưới (bottom 104), nền ink chữ kem, tự ẩn sau 2.2s.
- **Pipeline xử lý ảnh:** ticker mỗi 1.4s đẩy trạng thái sang bước kế; bước cuối `ready` gọi `onProcessed()` để tăng readyCount.
- **Gen gợi ý:** spinner ~0.65s/bước, 4 bước rồi sang results.
- **Spinner:** `@keyframes spin` (rotate 360°, 0.9s linear).

## State Management
State chính (hiện ở component `App`):
- `authed` (bool) — đã đăng nhập chưa.
- `onboarding` (bool) — đang xem onboarding (chỉ bật khi đăng ký mới).
- `tab` (`home|closet|add|analytics`) + `stack` (mảng `{screen, params}` cho push).
- `closet` (mảng món; mỗi món có cờ `archived`).
- `saved` (mảng id outfit đã lưu).
- `bonus` (số món vừa xử lý xong từ Add — cộng vào readyCount).
- `theme` (`{accent, paper, corners, serifHeads}`) — điều khiển toàn bộ giao diện; đổi từ màn Appearance.
- `toastMsg`.

**Logic gate gamification (quan trọng):** `readyCount = số_món_chưa_archive + bonus`. Nếu `readyCount < 15` → Home khóa gợi ý (LockedGate), người dùng phải thêm đủ 15 món mới mở khóa AI suggestion. (Theo SPEC: backend trả 403 nếu chưa đủ.)

**Data fetching (app thật):** đăng nhập (Supabase Auth) · CRUD tủ đồ + ảnh (Supabase Storage) · upload → tách nền + Gemini tagging (FastAPI) · gọi gợi ý outfit (Gemini) · thời tiết (API thời tiết theo vị trí) · analytics (truy vấn lịch sử mặc).

---

## Design Tokens

### Bộ theme đã CHỐT (mặc định production)
- **Tông nhấn:** Nâu đất `#A2543B` (accent), accentSoft `#F1E2D9`
- **Tông giấy:** Trung tính → bg `#F3F2EF`, bg2 `#EAE9E4`, surface `#FFFFFF`, ground `#ECEAE4`
- **Bo góc:** Mềm → radius `24px`, radius-sm `16px`
- **Tiêu đề serif:** Bật

### Màu hệ thống (cố định mọi theme)
| Token | Hex | Dùng cho |
|---|---|---|
| ink | `#1E1B16` | text chính, nút đậm |
| ink2 | `#574F44` | text phụ đậm |
| sub | `rgba(30,27,22,0.52)` | text phụ |
| faint | `rgba(30,27,22,0.36)` | kicker, caption |
| line | `rgba(30,27,22,0.10)` | viền, divider |
| sage | `#5F7E64` | chip dịp, toggle on, success |
| sageSoft | `#E5EEE6` | nền chip sage |
| star | `#D9A441` | sao đánh giá |
| danger | `#B4503C` | lỗi, đăng xuất |

### Các tông nhấn thay thế (màn Appearance)
- Xanh rêu `#5F7E64` / soft `#E5EEE6` · Than chì `#2A2620` / soft `#E9E4DA` · Mận khô `#7A5A6E` / soft `#EFE3EA`

### Các tông giấy thay thế
- Ấm: bg `#F4EEE4`, bg2 `#EDE6D9`, surface `#FCFAF5`, ground `#EAE2D4`
- Sáng: bg `#FAF9F6`, bg2 `#F1F0EC`, surface `#FFFFFF`, ground `#F0EEE9`

### Bo góc thay thế
- Vừa: 16 / 12 · Sắc: 8 / 6

### Shadow
- shadow: `0 1px 2px rgba(50,38,24,0.05), 0 8px 22px rgba(60,45,28,0.07)`
- shadowLg: `0 2px 6px rgba(50,38,24,0.06), 0 20px 48px rgba(60,45,28,0.14)`

### Typography
- **Serif (tiêu đề / số):** **Playfair Display** — cỡ dùng: 44 (welcome), 40, 38 (onboarding), 34 (title màn), 33 (greeting), 28 (item/outfit), 25/21/20 (card/section), 56 (nhiệt độ). Có dùng *italic* để nhấn 1 từ.
- **Sans (thân / nhãn):** **Be Vietnam Pro** — body 13–15.5px, nhãn nút 14.5px, **Kicker** 11px weight 600 UPPERCASE letter-spacing 2.
- *(Cả 2 đều là Google Fonts; trong RN dùng expo-font / @expo-google-fonts.)*

### Spacing & cỡ chạm
- Padding ngang màn: **16–22px**. Gap card: **10–14px**.
- Khung thiết kế: **iPhone 390×844** (logic px = dp trong RN).
- Hit target nút icon ≥ 42px; nút shutter 66px; nút chính cao 50px.

---

## Design System chuẩn hóa (FS · TXT · SP · Theme)

> Phần này **chuẩn hóa** các giá trị rải rác ở trên thành thang/token đặt tên, để mọi màn dùng chung một nguồn — KHÔNG bịa cỡ chữ/spacing mới. Toàn bộ gom từ giá trị thực trong prototype (làm tròn về bậc gần nhất). Đơn vị = dp (React Native).

### SP — Spacing scale
Thang 4pt. Mọi padding/gap/margin phải snap về một bậc.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `sp0` | 0 | reset |
| `sp1` | 4 | gap icon–text, khe nhỏ |
| `sp2` | 8 | gap chip, padding nhỏ |
| `sp3` | 12 | gap card, padding trung |
| `sp4` | 16 | **padding ngang màn (chuẩn)**, gap list |
| `sp5` | 20 | padding card lớn |
| `sp6` | 24 | padding ngang màn rộng, section gap |
| `sp7` | 32 | khoảng cách lớn giữa khối |
| `sp8` | 40 | padding dọc hero/empty state |
| ~~`sp10`~~ | ~~54–58~~ | **Không dùng giá trị cứng** — luôn dùng `useSafeAreaInsets().top` từ `react-native-safe-area-context` (thay đổi theo device) |

*Quy ước: padding ngang màn mặc định `sp4` (16); màn nội dung thưa (Onboarding/Auth) dùng `sp6`–`sp8`.*

### FS — Font size scale
| Token | Size / Line-height | Ghi chú |
|---|---|---|
| `fs-caption` | 11 / 16 | kicker, caption, badge |
| `fs-sm` | 12.5 / 18 | text phụ, meta |
| `fs-body` | 14 / 20 | **body chuẩn** |
| `fs-md` | 15.5 / 22 | body nhấn, mô tả welcome |
| `fs-label` | 16 / 22 | nhãn nút, field value |
| `fs-h3` | 20 / 26 | tiêu đề card/section |
| `fs-h2` | 25 / 30 | tên outfit nổi |
| `fs-h1` | 28 / 32 | tiêu đề item/outfit |
| `fs-title` | 34 / 38 | tiêu đề màn (Tủ đồ, Thống kê) |
| `fs-display` | 40 / 42 | greeting / onboarding |
| `fs-hero` | 44 / 46 | tiêu đề Welcome |
| `fs-numeric` | 56 / 56 | số lớn (nhiệt độ) |

### TXT — Named text styles
Mỗi style = font + size + weight + letter-spacing. **Luôn dùng style đặt tên, không set cỡ rời.**

| Style | Font | Size (FS) | Weight | L-spacing | Dùng cho |
|---|---|---|---|---|---|
| `txt.hero` | Playfair Display | fs-hero | 600 | -0.8 | Welcome headline |
| `txt.display` | Playfair Display | fs-display | 600 | -0.5 | greeting, onboarding |
| `txt.title` | Playfair Display | fs-title | 600 | -0.5 | tiêu đề màn |
| `txt.h1` | Playfair Display | fs-h1 | 600 | -0.3 | item/outfit name |
| `txt.h2` | Playfair Display | fs-h2 | 600 | -0.2 | tên outfit card |
| `txt.h3` | Playfair Display | fs-h3 | 600 | 0 | tiêu đề card/section |
| `txt.numeric` | Playfair Display | fs-numeric | 500 | -1.5 | nhiệt độ |
| `txt.body` | Be Vietnam Pro | fs-body | 400 | 0 | body chuẩn |
| `txt.bodyStrong` | Be Vietnam Pro | fs-body | 600 | 0 | body nhấn |
| `txt.md` | Be Vietnam Pro | fs-md | 400 | 0 | mô tả welcome |
| `txt.label` | Be Vietnam Pro | fs-label | 600 | 0.2 | nhãn nút (sans) |
| `txt.button` | Playfair Display | fs-label | 500 | 0.2 | chữ PrimaryBtn |
| `txt.caption` | Be Vietnam Pro | fs-sm | 400 | 0 | meta, caption |
| `txt.kicker` | Be Vietnam Pro | fs-caption | 600 | +2 (UPPERCASE) | Kicker / nhãn nhỏ |

*Lưu ý: serif (Playfair) có biến thể **italic** dùng để nhấn 1 từ trong tiêu đề — giữ làm prop của style, không tạo style riêng.*

### Radius — token đặt tên
| Token | Mềm (mặc định) | Vừa | Sắc | Dùng cho |
|---|---|---|---|---|
| `radius.card` | 24 | 16 | 8 | SoftCard, sheet, viewfinder |
| `radius.sm` | 16 | 12 | 6 | thumbnail, ô con trong card |
| `radius.pill` | 999 | 999 | 999 | pill, chip, nút tròn, avatar |
| `radius.field` | 14 | 14 | 14 | input (cố định) |

### Shadow — token đặt tên
RN không support multi-layer shadow — giá trị CSS bên dưới chỉ là visual reference. Dùng giá trị RN thật từ `mobile/lib/theme.ts` (`shadow` và `shadowLg`).

| Visual reference (CSS) | Token |
|---|---|
| `0 1px 2px rgba(50,38,24,0.05), 0 8px 22px rgba(60,45,28,0.07)` | `shadow.card` |
| `0 2px 6px rgba(50,38,24,0.06), 0 20px 48px rgba(60,45,28,0.14)` | `shadow.lg` |

*RN implementation: `shadowColor/Offset/Opacity/Radius` (iOS) + `elevation` (Android). Xem `mobile/lib/theme.ts` để lấy giá trị chính xác.*

### ThemeProvider + useTheme() — interface chuẩn
Mọi token (màu, FS, TXT, SP, radius, shadow) phải đi qua một `ThemeProvider` duy nhất, sinh ra từ 4 lựa chọn của người dùng (màn Appearance). Port từ hàm `buildVars` trong `app-core.jsx`.

```ts
// theme/types.ts
export type AccentKey = 'clay' | 'sage' | 'mono' | 'plum';   // Nâu đất | Xanh rêu | Than chì | Mận khô
export type PaperKey  = 'warm' | 'neutral' | 'bright';        // Ấm | Trung tính | Sáng
export type CornerKey = 'soft' | 'medium' | 'sharp';          // Mềm | Vừa | Sắc

export interface ThemeChoice {
  accent: AccentKey;      // mặc định 'clay'
  paper: PaperKey;        // mặc định 'neutral'
  corners: CornerKey;     // mặc định 'soft'
  serifHeads: boolean;    // mặc định true
}

export interface Theme {
  color: {
    bg: string; bg2: string; surface: string; ground: string;
    ink: string; ink2: string; sub: string; faint: string; line: string;
    accent: string; accentSoft: string;
    sage: string; sageSoft: string; star: string; danger: string;
  };
  fs: Record<'caption'|'sm'|'body'|'md'|'label'|'h3'|'h2'|'h1'|'title'|'display'|'hero'|'numeric', { size: number; lh: number }>;
  txt: Record<string, TextStyle>;   // các named text style ở bảng TXT
  sp: (step: number) => number;     // sp(4) => 16  (step * 4, trừ sp10 = safe-area)
  radius: { card: number; sm: number; pill: number; field: number };
  shadow: { card: ViewStyle; lg: ViewStyle };
}

// theme/ThemeProvider.tsx
// - Lưu ThemeChoice vào AsyncStorage (key 'theme'), khôi phục khi mở app.
// - buildTheme(choice): map accent/paper/corners → bảng token (xem buildVars + các bảng "thay thế" ở trên).
// - serifHeads=false → các txt.* serif đổi sang Be Vietnam Pro.
export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element;
export function useTheme(): Theme & { choice: ThemeChoice; setChoice: (c: Partial<ThemeChoice>) => void };
```

**Quy tắc dùng:** component KHÔNG hardcode màu/cỡ/spacing — luôn lấy từ `useTheme()`:
```tsx
const t = useTheme();
<View style={{ padding: t.sp(4), backgroundColor: t.color.surface, borderRadius: t.radius.card, ...t.shadow.card }}>
  <Text style={t.txt.h3}>Gợi ý hôm nay</Text>
</View>
```
Màn **Appearance** chỉ gọi `setChoice({ accent: 'sage' })` → toàn app đổi tức thì.



### Iconography
Toàn bộ icon là **SVG stroke** (vẽ trong `app-core.jsx`, hàm `Icon`, đối tượng `PATHS`), nét 1.8, bo tròn đầu. Trong RN nên thay bằng thư viện tương đương (vd `react-native-svg` + lift nguyên path, hoặc `lucide-react-native` cho các icon phổ thông: home, search, heart, camera, bell, shield… và tự vẽ icon đặc thù như hanger).

## Assets
- **Không có ảnh bitmap thật.** Quần áo = SVG flat-lay tự vẽ trong `garments.jsx` (16 kiểu: tee, shirt, hoodie, sweater, jacket, coat, pants, jeans, shorts, skirt, dress, sneakers, boots, bag, cap, glasses). Đây chỉ là **placeholder** — app thật thay bằng ảnh người dùng đã tách nền.
- Logo (móc treo) & mọi icon = SVG nội tuyến, không phải file rời.
- Fonts: Playfair Display + Be Vietnam Pro (Google Fonts).

## Files
File HTML/JSX trong gói (tham chiếu trực quan — mở `AwesomeCloset - Prototype.html` bằng trình duyệt để xem chạy):
- `AwesomeCloset - Prototype.html` — file gốc, router + state + theme.
- `app-core.jsx` — design tokens (`buildVars`), primitives (Icon, Kicker, SoftCard, Pill, PrimaryBtn, GhostBtn, IconBtn, Bar, Stars, Sheet, Toast), context.
- `app-extras.jsx` — Collage, taxonomy (màu/phong cách/mùa), dữ liệu thống kê.
- `garments.jsx` — minh họa quần áo SVG + mock data tủ đồ + outfit (bối cảnh VN).
- `app-onboarding.jsx`, `app-auth.jsx` — onboarding + đăng nhập/đăng ký.
- `app-home.jsx`, `app-closet.jsx`, `app-add.jsx`, `app-outfit.jsx`, `app-analytics.jsx` — màn chính.
- `app-profile.jsx`, `app-settings.jsx` — hồ sơ, lưu trữ, tùy chỉnh giao diện.
- `ios-frame.jsx` — khung iPhone (chỉ để xem preview, KHÔNG cần port).

## Notes quan trọng khi port sang React Native
1. **Đối chiếu SPEC.md** trong repo gốc (`baopd79/awesomecloset` → `docs/SPEC.md`) cho enum taxonomy chuẩn (style/season/occasion), schema dữ liệu, và contract API. UI này đã bám theo SPEC nhưng SPEC là nguồn chân lý.
2. **Animation chỉ dùng `transform`/translate, không fade từ opacity 0** — trong prototype web, opacity-0 ban đầu có thể bị "đóng băng". RN dùng `Animated`/`Reanimated` thì không gặp lỗi này, nhưng vẫn nên giữ nguyên ngôn ngữ chuyển động (slide ngang khi push, mượt 0.3s).
3. **Theme động:** nên dựng một `ThemeProvider` (Context) sinh ra bảng token từ `{accent, paper, corners, serifHeads}` — giống hàm `buildVars` trong `app-core.jsx` — để màn Appearance đổi tức thì.
4. **Masonry tủ đồ:** web dùng CSS `columns`; RN nên dùng thư viện masonry (vd `@shopify/flash-list` với layout 2 cột so le, hoặc `react-native-masonry-list`).
5. **Gate 15 món, pipeline trạng thái ảnh, feedback sao** là logic nghiệp vụ cốt lõi — giữ đúng.
