# Mobile — Hướng dẫn lý thuyết & triển khai

Tài liệu này dành cho developer lần đầu làm việc với React Native / Expo trong project này.

---

## 1. Luồng triển khai từ tạo project đến code chạy được

### Bước 1 — Tạo project Expo

```bash
npx create-expo-app mobile --template blank-typescript
cd mobile
```

Lệnh này tạo project bare-minimum. Project này dùng thêm Expo Router nên cần config thêm:

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens
```

`app.json` khai báo entry point là Expo Router:
```json
{
  "expo": {
    "scheme": "awesomecloset",
    "web": { "bundler": "metro" }
  }
}
```

`package.json` set main:
```json
{ "main": "expo-router/entry" }
```

Từ đây Expo Router tự tìm `app/` folder làm root của routing.

---

### Bước 2 — Cài thêm dependencies

Luôn dùng `npx expo install` thay vì `npm install` để Expo chọn version tương thích với SDK:

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
npx expo install expo-font expo-splash-screen expo-secure-store
npx expo install react-native-gesture-handler react-native-reanimated
npx expo install expo-image-picker expo-file-system
```

Mỗi package trong Expo có version ghim với SDK (ví dụ SDK 56 → `expo-image-picker@~56.0.15`). `npx expo install` tự xử lý việc này.

---

### Bước 3 — Tạo cấu trúc thư mục

Project này tổ chức theo quy ước:

```
mobile/
  app/            # routes — Expo Router đọc folder này
  components/
    ui/           # design system components dùng lại
  hooks/          # custom React hooks
  lib/            # clients và utilities (supabase, theme, api)
  assets/         # fonts, images
```

Tạo từng folder, sau đó thêm file vào đúng chỗ theo quy tắc dưới đây.

---

### Bước 4 — Setup design system

**4a. Theme** (`lib/theme.ts`) — định nghĩa toàn bộ tokens:

```typescript
export const T = resolveTheme(DEFAULT_THEME);
// T.ink, T.accent, T.surface, T.r, T.rsm, ...
```

Tất cả màu/radius đều lấy từ `T`. Không hardcode hex string trong component.

**4b. Fonts** — khai báo trong root layout `app/_layout.tsx`:

```typescript
const [fontsLoaded] = useFonts({
  PlayfairDisplay_700Bold,
  BeVietnamPro_400Regular,
  BeVietnamPro_600SemiBold,
});
// render null cho đến khi fontsLoaded === true
```

Font phải load xong trước khi render bất kỳ Text nào dùng custom font — nếu không app crash.

**4c. UI components** (`components/ui/`) — các primitive tái sử dụng:

```
Icon.tsx        # SVG icons (không dùng thư viện ngoài)
PrimaryBtn.tsx  # nút chính
GhostBtn.tsx    # nút outline
Kicker.tsx      # label nhỏ trên heading
```

Viết component mới ở đây khi cần primitive dùng nhiều hơn 2 màn hình.

---

### Bước 5 — Setup routing

**5a. Root layout** (`app/_layout.tsx`) — xử lý auth guard và font:

```
Mở app
  → load fonts + check session song song
  → nếu chưa xong: render null (splash screen vẫn hiện)
  → xong:
      không có session      → redirect /(auth)
      có session, chưa onboard → redirect /(onboarding)
      có session, đã onboard   → redirect /(tabs)
```

**5b. Route groups** — tạo folder với tên `(group)`:

```
app/(auth)/index.tsx        → màn hình login/register
app/(onboarding)/index.tsx  → màn hình onboarding
app/(tabs)/_layout.tsx      → tab bar
app/(tabs)/index.tsx        → tab "Hôm nay"
```

Group không xuất hiện trong URL — chỉ để tổ chức layout.

**5c. Thêm màn hình mới** — tạo file trong đúng group:

```bash
# muốn thêm màn hình chi tiết item
touch app/item/[id].tsx
```

Expo Router tự detect file mới khi Metro đang chạy — không cần config gì thêm.

---

### Bước 6 — Kết nối Supabase

**6a. Client** (`lib/supabase.ts`):

```typescript
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storage: AsyncStorage } },  // persist session trên device
);
```

Env vars phải có prefix `EXPO_PUBLIC_` để Metro expose vào JS bundle.

**6b. Auth hook** (`hooks/useSession.ts`) — subscribe auth state changes:

```typescript
supabase.auth.onAuthStateChange((_event, session) => {
  setSession(session);
});
```

Dùng `useSession()` trong bất kỳ component nào cần user info.

---

### Bước 7 — Kết nối backend API

Toàn bộ HTTP calls tập trung trong `lib/api.ts`:

```
lib/api.ts
  ├── types (ItemResponse, ProcessingStatus, ...)
  ├── getToken()          ← lấy JWT từ supabase session
  ├── uploadItem()        ← dùng expo-file-system/legacy
  └── retryItem()         ← dùng fetch thường
```

Quy tắc: **không gọi fetch trực tiếp trong component/screen** — luôn qua `lib/api.ts`.

---

### Bước 8 — Thêm tính năng mới (pattern chuẩn)

Khi implement 1 feature (ví dụ upload queue):

```
1. lib/api.ts          → thêm hàm gọi API
2. hooks/use*.ts       → thêm hook nếu có logic phức tạp / realtime
3. components/*.tsx    → thêm component con
4. app/(tabs)/*.tsx    → thêm/sửa màn hình
```

Luồng dữ liệu luôn đi một chiều:

```
Screen (state) → Component (display) → Hook (side effects) → API/Supabase
     ↑_________________________callback______________________↓
```

---

## 2. Lý thuyết nền tảng — React Native / Expo

Hiểu phần này giúp debug nhanh hơn khi có vấn đề.

### Tổng quan kiến trúc

```
TypeScript code
      ↓
  Metro Bundler     (transpile + bundle JS)
      ↓
  JS Bundle         (chạy trong JS engine trên device)
      ↓
  JSI / Bridge      (giao tiếp 2 chiều)
      ↓
  Native Layer      (UIKit/SwiftUI trên iOS, Android Views)
      ↓
  Màn hình thật
```

React Native **không chạy trong WebView**. JS code chạy trong engine riêng (Hermes trên Android, JSCore/Hermes trên iOS), giao tiếp với native layer qua một lớp trung gian. Kết quả render là native component thật của hệ điều hành.

---

### Metro Bundler — dev server

Khi chạy `npx expo start`, Metro khởi động và làm 3 việc:

1. **Transpile** — TypeScript → JavaScript, JSX → `React.createElement()` calls
2. **Bundle** — gom tất cả `import` thành 1 file JS
3. **Serve** — expose bundle qua HTTP để app tải về

App trên simulator/device kết nối tới Metro, tải bundle về và chạy. Mỗi khi bạn sửa file, Metro re-bundle phần đó và push lên app — đây là **Fast Refresh** (không restart app, chỉ update component đang sửa).

```
Sửa file → Metro detect change → re-bundle → push delta → app update
                                                          (< 1 giây)
```

Bấm `r` trong terminal để **full reload** (tải lại toàn bộ bundle + reset state).

---

### Expo Router — từ file đến màn hình

Expo Router chạy một bước **ahead-of-time** khi Metro khởi động: nó scan toàn bộ `app/` và tạo ra routing config tự động.

```
app/
  _layout.tsx          → root navigator (Slot)
  (tabs)/
    _layout.tsx        → tab navigator
    index.tsx          → route "/"
    add.tsx            → route "/add"
  (auth)/
    index.tsx          → route "/(auth)"
```

Khi user navigate tới một route:
1. Expo Router tìm file tương ứng
2. Import component (lazy — chưa dùng thì chưa load)
3. Render vào navigator

**Lưu ý:** Thêm file mới vào `app/` → Metro tự detect, không cần restart.

---

### Native Modules — Expo SDK

Các package như `expo-image-picker`, `expo-file-system` có 2 phần:

```
JS wrapper (TypeScript API)
      ↓ JSI call
Native module (Swift/Kotlin code)
```

Khi bạn gọi `ImagePicker.launchCameraAsync()`, JS gọi qua JSI xuống Swift code thật của iOS. Đây là lý do:
- Cần native build (không chạy được trên Expo Go SDK 56)
- Một số API chỉ có trên device thật (camera), không có trên simulator

---

### Build types

| Loại | Dùng khi | Thời gian |
|---|---|---|
| **Dev (Metro)** | Viết code hàng ngày | Ngay lập tức |
| **Dev build** (`expo run:ios`) | Test native modules trên device thật | ~10 phút lần đầu, incremental sau |
| **Preview build** (EAS) | Test với tester bên ngoài | ~15 phút trên cloud |
| **Production build** (EAS) | App Store / Play Store | ~20 phút trên cloud |

Project đang ở giai đoạn **Dev (Metro)** trên simulator. Khi cần test camera thật → cần **Dev build** trên device.

---

### App startup flow

Khi app khởi động, thứ tự các bước là:

```
1. Native app launch → load JS bundle
2. RootLayout mount
3. SplashScreen.preventAutoHideAsync()   ← giữ splash screen
4. Load fonts (async)
5. Kiểm tra Supabase session (async)
6. Kiểm tra AsyncStorage (onboarding flag)
7. Tất cả ready → SplashScreen.hideAsync()
8. Redirect đúng route (auth / onboarding / tabs)
```

`app/_layout.tsx` orchestrate toàn bộ flow này. Nếu render `null` trong lúc chờ → splash screen vẫn hiển thị, user không thấy màn hình trắng.

---

### State và re-render

React Native dùng đúng React model — **state thay đổi → component re-render → native layer update**. Không có virtual DOM diff như web, nhưng RN có reconciler riêng làm việc tương tự.

Performance tip: `StyleSheet.create()` xử lý styles ở native layer một lần khi module load — nhanh hơn inline object `style={{ ... }}` (tạo object mới mỗi render). Dùng inline style chỉ khi giá trị dynamic (ví dụ: width theo state).

---

## 2. Lý thuyết nền tảng

### React Native là gì?

React Native (RN) cho phép viết UI bằng JavaScript/TypeScript, nhưng render ra **native component** thật của iOS/Android — không phải WebView. Tư duy giống React (component, state, props, hooks), nhưng không có DOM.

**Khác biệt chính so với React web:**

| Web | React Native |
|---|---|
| `<div>`, `<span>` | `<View>`, `<Text>` |
| CSS (flexbox, %) | StyleSheet (flexbox, số pixel) |
| `onClick` | `onPress` |
| `fetch` + FormData | `expo-file-system` cho file upload |
| `window`, `document` | Không có — dùng Expo APIs |
| Percentage width (`50%`) | Có thể dùng nhưng hạn chế — prefer `flex` hoặc `onLayout` |

### Expo là gì?

Expo là framework trên React Native cung cấp:
- **Expo Router** — file-based routing (giống Next.js)
- **Expo SDK** — APIs cho camera, file system, image picker, v.v.
- **`expo start`** — dev server với hot reload
- **EAS Build** — build native app trên cloud

Project này dùng **Expo SDK 56** với **Expo Router v3**.

---

## 2. Cấu trúc thư mục

```
mobile/
  app/                    # Routes (Expo Router — file = route)
    _layout.tsx           # Root layout: auth guard + font loading
    (auth)/               # Group: màn hình login/register
    (onboarding)/         # Group: màn hình onboarding
    (tabs)/               # Group: tab navigation chính
      _layout.tsx         # Tab bar custom
      index.tsx           # Tab "Hôm nay"
      closet.tsx          # Tab "Tủ đồ"
      add.tsx             # Tab "Thêm đồ"
      analytics.tsx       # Tab "Thống kê"

  components/
    ui/                   # Design system components (dùng lại nhiều)
      Icon.tsx            # SVG icons
      PrimaryBtn.tsx      # Nút chính (ink background)
      GhostBtn.tsx        # Nút outline
      Kicker.tsx          # Label nhỏ trên heading
    ItemProcessingCard.tsx  # Card xử lý từng item trong upload queue

  hooks/
    useSession.ts         # Lấy Supabase auth session
    useRealtimeItem.ts    # Subscribe Supabase Realtime cho 1 item

  lib/
    supabase.ts           # Supabase client
    theme.ts             # Design tokens (T.ink, T.accent, T.r, ...)
    api.ts               # HTTP calls tới FastAPI backend

  assets/                 # Fonts, images
```

---

## 3. Routing — Expo Router

Expo Router dùng **file system làm route**. Tên file = đường dẫn URL.

### Groups `(name)/`

Folder tên `(name)` là **group** — gom các màn hình lại nhưng không xuất hiện trong URL. Dùng để áp dụng layout chung.

```
app/
  (auth)/
    index.tsx       → route "/(auth)"
  (tabs)/
    index.tsx       → route "/(tabs)"
    add.tsx         → route "/(tabs)/add"
```

### Layout file `_layout.tsx`

Mỗi folder có thể có `_layout.tsx` — wrapper bọc các màn hình con. Root layout (`app/_layout.tsx`) xử lý:
- Load fonts
- Kiểm tra session (auth guard)
- Redirect đúng group

### Navigation

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();
router.replace('/(tabs)');   // thay thế history (không back được)
router.push('/(tabs)/add');  // push lên stack
```

---

## 4. Styling

Project dùng `StyleSheet.create` — không phải CSS.

### StyleSheet.create

```typescript
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    backgroundColor: T.surface,
  },
});
// dùng: <View style={styles.card} />
```

### Theme — `T`

Tất cả màu sắc, border radius, shadow lấy từ `T` (import từ `@/lib/theme`):

```typescript
import { T } from '@/lib/theme';

T.ink        // màu chữ chính (#1E1B16)
T.sub        // màu chữ phụ (rgba)
T.accent     // màu nhấn (clay #A2543B)
T.accentSoft // background nhạt của accent
T.sage       // màu xanh lá (success)
T.danger     // màu đỏ (error)
T.surface    // nền card
T.bg         // nền trang
T.ground     // nền element nhạt hơn surface
T.line       // màu border
T.r          // border radius lớn (24)
T.rsm        // border radius nhỏ (16)
```

### Fonts

Chỉ dùng 2 font family:
- **`PlayfairDisplay_700Bold`** — serif, cho heading/title
- **`BeVietnamPro_400Regular`** / `_600SemiBold` / `_700Bold` — sans-serif, cho body

```typescript
fontFamily: 'PlayfairDisplay_700Bold'
fontFamily: 'BeVietnamPro_600SemiBold'
```

### Percentage width — cẩn thận

`width: '50%'` hoạt động khi parent có fixed width. Khi parent dùng `flex: 1` + `maxWidth`, dùng `onLayout` để lấy pixel width:

```typescript
const [w, setW] = useState(0);
<View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
  <View style={{ width: w * 0.5 }} />  // 50% theo pixel
</View>
```

---

## 5. Auth — Supabase

### Session

```typescript
import { useSession } from '@/hooks/useSession';

const { session, loading } = useSession();
// session.user.id  → user UUID
// session.access_token → JWT gửi lên backend
```

Root layout xử lý redirect tự động:
- Không có session → `/(auth)`
- Có session, chưa onboard → `/(onboarding)`
- Có session, đã onboard → `/(tabs)`

### Lấy JWT để gọi API

```typescript
const { data } = await supabase.auth.getSession();
const token = data.session?.access_token;
// gửi: Authorization: Bearer <token>
```

---

## 6. Gọi API backend (FastAPI)

URL backend: `EXPO_PUBLIC_API_URL` trong `.env.local`.

### Upload file — dùng `expo-file-system/legacy`

React Native 0.73+ đổi `FormData` — `{ uri, name, type }` không còn được support. Dùng `FileSystem.uploadAsync`:

```typescript
import * as FileSystem from 'expo-file-system/legacy';

const result = await FileSystem.uploadAsync(
  `${API_URL}/api/items/upload`,
  fileUri,          // file:// URI từ image picker
  {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    headers: { Authorization: `Bearer ${token}` },
  },
);
const data = JSON.parse(result.body);
```

### JSON requests thông thường — dùng `fetch`

```typescript
const response = await fetch(`${API_URL}/api/items/${id}/retry`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## 7. Supabase Realtime

Dùng để nhận update từ DB real-time mà không cần poll.

### Setup cần thiết

Bảng phải được add vào Supabase Realtime publication (chạy 1 lần trong SQL Editor):
```sql
alter publication supabase_realtime add table clothing_items;
```

### Subscribe trong React

```typescript
const channel = supabase
  .channel('my-channel-name')       // tên tùy, phải unique
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'clothing_items',       // tên bảng trong DB, không phải API route
      filter: `id=eq.${itemId}`,
    },
    (payload) => {
      console.log(payload.new);      // row mới sau update
    },
  )
  .subscribe();

// cleanup khi unmount
return () => { supabase.removeChannel(channel); };
```

**Lưu ý quan trọng:** tên bảng lấy từ `__tablename__` trong SQLModel model (`backend/items/models.py`), không phải từ tên folder hay API route.

---

## 8. Image Picker

```typescript
import * as ImagePicker from 'expo-image-picker';

// kiểm tra permission trước
const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();

// mở gallery (batch)
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: 'images',
  allowsMultipleSelection: true,
  selectionLimit: 10,
  quality: 0.85,
});

if (!result.canceled) {
  result.assets.forEach(asset => {
    console.log(asset.uri);  // file:// URI
  });
}

// mở camera
const result = await ImagePicker.launchCameraAsync({
  mediaTypes: 'images',
  quality: 0.85,
});
```

---

## 9. Chạy local

```bash
cd mobile
npm install
cp .env.local.example .env.local   # điền Supabase keys

npx expo start          # dev server
# bấm 'i' → iOS simulator
# bấm 'a' → Android emulator
```

**Lưu ý:** Expo Go không support SDK 56. Để test trên device thật:
```bash
npx expo run:ios --device    # build dev client lần đầu (~10 phút)
```

---

## 10. Luồng viết code mobile từ đầu đến xong

### Bước 0 — Tạo branch

```bash
git checkout -b feat/<task-id>-<slug>
# ví dụ: feat/7-mobile-upload
```

Luôn làm bước này **trước** khi chạy bất kỳ lệnh install hay sửa file nào.

---

### Bước 1 — Đọc nguồn chân lý

Mỗi task UI đều có prototype trong `design_handoff_awesomecloset/`:

```
design_handoff_awesomecloset/
  README.md           # bảng màu, typography, spacing, UX rules
  app-<feature>.jsx   # prototype màn hình cụ thể
```

Đọc `README.md` để lấy token names, đọc `app-<feature>.jsx` để hiểu layout, text tiếng Việt, và UX intent. Đây là **nguồn duy nhất để quyết định UI** — không tự sáng tác.

---

### Bước 2 — Đọc API contract

Trước khi viết bất kỳ dòng fetch nào, đọc backend:

```bash
backend/items/router.py    # endpoints, HTTP method, status codes
backend/items/schemas.py   # request/response types
backend/items/models.py    # __tablename__ (dùng cho Realtime)
```

Mapping từ backend sang TypeScript interface trong `lib/api.ts`.

---

### Bước 3 — Cài deps nếu cần

```bash
npx expo install <package>   # dùng expo install, không dùng npm install
# ví dụ:
npx expo install expo-image-picker
```

`npx expo install` chọn version tương thích với SDK hiện tại tự động.

---

### Bước 4 — Build bottom-up

Thứ tự implement: **nhỏ nhất trước, màn hình sau**.

```
1. Component con độc lập   (ví dụ: ItemProcessingCard)
2. Hook nếu cần            (ví dụ: useRealtimeItem)
3. Màn hình (screen)       (ví dụ: add.tsx)
```

**Template 1 component:**

```typescript
// components/MyCard.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { T } from '@/lib/theme';

interface Props {
  title: string;
}

export function MyCard({ title }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.rsm,
    padding: 16,
  },
  title: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 14,
    color: T.ink,
  },
});
```

**Template 1 màn hình:**

```typescript
// app/(tabs)/my-screen.tsx
import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Kicker } from '@/components/ui/Kicker';
import { T } from '@/lib/theme';

export default function MyScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView>
        <Kicker>Label nhỏ phía trên</Kicker>
        <Text style={styles.title}>Tiêu đề màn hình</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 34,
    color: T.ink,
    letterSpacing: -0.5,
    marginTop: 6,
  },
});
```

---

### Bước 5 — Dịch JSX prototype sang React Native

Prototype dùng HTML/CSS — cần dịch sang RN:

| JSX prototype | React Native |
|---|---|
| `<div style={{ display: 'flex' }}>` | `<View style={{ flexDirection: 'row' }}>` |
| `<span>text</span>` | `<Text>text</Text>` |
| `onClick` | `onPress` |
| `<button>` | `<Pressable>` hoặc `<PrimaryBtn>` / `<GhostBtn>` |
| `borderRadius: 'var(--radius-sm)'` | `borderRadius: T.rsm` |
| `color: TOK.ink` | `color: T.ink` |
| `fontFamily: TOK.sans` | `fontFamily: 'BeVietnamPro_400Regular'` |
| `fontFamily: TOK.serif` | `fontFamily: 'PlayfairDisplay_700Bold'` |
| `position: 'absolute', inset: 0` | `position: 'absolute', top: 0, left: 0, right: 0, bottom: 0` |
| `gap: 8` | `gap: 8` (hỗ trợ từ RN 0.71+) |

---

### Bước 6 — Kiểm tra TypeScript

```bash
npm run ts
```

Chạy sau mỗi lần thêm file mới. Sửa hết lỗi trước khi test trên simulator.

---

### Bước 7 — Test trên simulator

```bash
npx expo start
# bấm 'i' để mở iOS simulator
# bấm 'r' để reload sau khi sửa code
```

Checklist khi test:
- Happy path hoạt động không
- Trạng thái loading/error hiển thị đúng không
- Không crash khi back lại màn hình
- Không crash khi permission bị từ chối

---

### Bước 8 — Dọn dẹp trước commit

- Xóa hết `console.log` debug
- Chạy lại `npm run ts` để xác nhận clean

---

### Bước 9 — Commit

```bash
git add <các file liên quan>   # không dùng git add -A
git commit -m "feat(task7): mô tả ngắn gọn"
```

---

### Bước 10 — Push và tạo PR

```bash
git push -u origin feat/<task-id>-<slug>
gh pr create --title "feat(task7): ..." --body "..."
```

---

## 11. Các lỗi hay gặp

| Lỗi | Nguyên nhân | Fix |
|---|---|---|
| `Unsupported FormDataPart implementation` | RN 0.73+ không support `{ uri, name, type }` trong FormData | Dùng `expo-file-system/legacy` `uploadAsync` |
| Realtime SUBSCRIBED nhưng không nhận event | Bảng chưa có trong `supabase_realtime` publication | Chạy `alter publication supabase_realtime add table <tên_bảng>` |
| Percentage width crash | `flex: 1` + `maxWidth` không tính được % | Dùng `onLayout` để lấy pixel width |
| Màn hình trắng sau login | Root layout redirect chạy trước font load xong | Root layout có `if (!ready) return null` — đợi `fontsLoaded` |
