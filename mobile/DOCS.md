# Mobile — Hướng dẫn lý thuyết & triển khai

Tài liệu này dành cho developer lần đầu làm việc với React Native / Expo trong project này.

---

## 1. Lý thuyết nền tảng

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

## 10. Các lỗi hay gặp

| Lỗi | Nguyên nhân | Fix |
|---|---|---|
| `Unsupported FormDataPart implementation` | RN 0.73+ không support `{ uri, name, type }` trong FormData | Dùng `expo-file-system/legacy` `uploadAsync` |
| Realtime SUBSCRIBED nhưng không nhận event | Bảng chưa có trong `supabase_realtime` publication | Chạy `alter publication supabase_realtime add table <tên_bảng>` |
| Percentage width crash | `flex: 1` + `maxWidth` không tính được % | Dùng `onLayout` để lấy pixel width |
| Màn hình trắng sau login | Root layout redirect chạy trước font load xong | Root layout có `if (!ready) return null` — đợi `fontsLoaded` |
