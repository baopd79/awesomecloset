import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerAsset } from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ItemProcessingCard, type LocalStatus } from '@/components/ItemProcessingCard';
import { GhostBtn } from '@/components/ui/GhostBtn';
import { Icon } from '@/components/ui/Icon';
import { Kicker } from '@/components/ui/Kicker';
import { PrimaryBtn } from '@/components/ui/PrimaryBtn';
import { uploadItem, type ProcessingStatus } from '@/lib/api';
import { T } from '@/lib/theme';

type PermSource = 'camera' | 'gallery';

interface QueueItem {
  key: string;
  itemId: string | null;
  localUri: string;
  status: LocalStatus;
}

let _keySeq = 0;

export default function AddScreen() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [readyCount, setReadyCount] = useState(0);
  const [permSheet, setPermSheet] = useState<PermSource | null>(null);
  const [pendingSource, setPendingSource] = useState<PermSource | null>(null);

  const handleReady = useCallback(() => {
    setReadyCount((c) => c + 1);
  }, []);

  const openPicker = useCallback(async (source: PermSource) => {
    const shared: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.85 };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ ...shared, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({
            ...shared,
            allowsMultipleSelection: true,
            selectionLimit: 10,
          });

    if (result.canceled) return;

    const newItems: QueueItem[] = result.assets.map((asset: ImagePickerAsset) => ({
      key: String(++_keySeq),
      itemId: null,
      localUri: asset.uri,
      status: 'uploading' as LocalStatus,
    }));
    setQueue((prev) => [...newItems, ...prev]);

    await Promise.allSettled(
      newItems.map(async (qi) => {
        try {
          const item = await uploadItem(qi.localUri);
          setQueue((prev) =>
            prev.map((q) =>
              q.key === qi.key
                ? { ...q, itemId: item.id, status: item.processing_status as LocalStatus }
                : q,
            ),
          );
        } catch (e) {
          console.error('[upload error]', String(e));
          setQueue((prev) =>
            prev.map((q) => (q.key === qi.key ? { ...q, status: 'failed' as LocalStatus } : q)),
          );
        }
      }),
    );
  }, []);

  const guard = useCallback(
    async (source: PermSource) => {
      const { status } =
        source === 'camera'
          ? await ImagePicker.getCameraPermissionsAsync()
          : await ImagePicker.getMediaLibraryPermissionsAsync();

      if (status === 'granted') {
        await openPicker(source);
      } else if (status === 'undetermined') {
        setPendingSource(source);
        setPermSheet(source);
      } else {
        Alert.alert(
          'Cần quyền truy cập',
          `Vào Cài đặt để cho phép AwesomeCloset truy cập ${source === 'camera' ? 'camera' : 'thư viện ảnh'}.`,
        );
      }
    },
    [openPicker],
  );

  const grantPermission = useCallback(async () => {
    const src = pendingSource;
    setPermSheet(null);
    setPendingSource(null);
    if (!src) return;

    const { status } =
      src === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status === 'granted') {
      await openPicker(src);
    } else {
      Alert.alert(
        'Không có quyền truy cập',
        `Vào Cài đặt để cho phép AwesomeCloset truy cập ${src === 'camera' ? 'camera' : 'thư viện ảnh'}.`,
      );
    }
  }, [pendingSource, openPicker]);

  const isCamSheet = permSheet === 'camera';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Kicker>Bước 1 · Chụp → AI gắn thẻ → Mặc</Kicker>
          <Text style={styles.title}>Thêm đồ</Text>
        </View>

        {/* viewfinder */}
        <View style={styles.viewfinderWrap}>
          <View style={styles.viewfinder}>
            <View style={styles.guideFrame} />
            {CORNERS.map(({ key, style: cornerStyle }) => (
              <View key={key} style={[styles.corner, cornerStyle]} />
            ))}
            <View style={styles.tip}>
              <Icon name="sun" size={13} color="#F0D9A8" />
              <Text style={styles.tipText}>Chụp trên nền sáng, mỗi ảnh một món</Text>
            </View>
          </View>
        </View>

        {/* action row */}
        <View style={styles.actions}>
          <GhostBtn icon="gallery" style={styles.sideBtn} onPress={() => guard('gallery')}>
            Thư viện
          </GhostBtn>
          <Pressable
            onPress={() => guard('camera')}
            style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
          >
            <View style={styles.shutterInner}>
              <Icon name="camera" size={22} color="#FBF8F2" />
            </View>
          </Pressable>
          <GhostBtn icon="spark" style={styles.sideBtn} onPress={() => guard('gallery')}>
            Nhiều ảnh
          </GhostBtn>
        </View>

        {/* queue */}
        {queue.length > 0 && (
          <View style={styles.queueSection}>
            <View style={styles.queueHeader}>
              <Text style={styles.queueTitle}>Hàng đợi xử lý</Text>
              {readyCount > 0 && (
                <Text style={styles.doneCount}>{readyCount} đã xong</Text>
              )}
            </View>
            {queue.map((item) => (
              <ItemProcessingCard
                key={item.key}
                itemId={item.itemId}
                localUri={item.localUri}
                initialStatus={item.status}
                onReady={handleReady}
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* permission bottom sheet */}
      <Modal
        visible={!!permSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setPermSheet(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setPermSheet(null)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {isCamSheet ? 'Cho phép dùng Camera' : 'Cho phép truy cập ảnh'}
          </Text>
          <View style={styles.sheetIconWrap}>
            <Icon name={isCamSheet ? 'camera' : 'gallery'} size={32} color={T.accent} />
          </View>
          <Text style={styles.sheetBody}>
            AwesomeCloset cần quyền{' '}
            {isCamSheet ? 'mở camera để chụp' : 'truy cập thư viện để chọn'} ảnh quần áo. Ảnh của
            bạn được lưu{' '}
            <Text style={styles.sheetBold}>riêng tư</Text>
            , chỉ bạn xem được.
          </Text>
          <View style={styles.privacyRow}>
            <Icon name="shield" size={14} color={T.sage} />
            <Text style={styles.privacyText}>
              Không chia sẻ công khai · có thể thu hồi bất kỳ lúc nào
            </Text>
          </View>
          <PrimaryBtn style={styles.sheetBtn} onPress={grantPermission}>
            Cho phép
          </PrimaryBtn>
          <Pressable style={styles.laterBtn} onPress={() => setPermSheet(null)}>
            <Text style={styles.laterText}>Để sau</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// corner markers for the viewfinder guide frame
const CORNER_SIZE = 22;
const CORNER_INSET = 18;
const CORNER_BORDER = 3;
const CORNER_RADIUS = 10;

const CORNERS = [
  {
    key: 'tl',
    style: {
      top: CORNER_INSET, left: CORNER_INSET,
      borderTopWidth: CORNER_BORDER, borderLeftWidth: CORNER_BORDER,
      borderTopLeftRadius: CORNER_RADIUS,
    },
  },
  {
    key: 'tr',
    style: {
      top: CORNER_INSET, right: CORNER_INSET,
      borderTopWidth: CORNER_BORDER, borderRightWidth: CORNER_BORDER,
      borderTopRightRadius: CORNER_RADIUS,
    },
  },
  {
    key: 'bl',
    style: {
      bottom: CORNER_INSET, left: CORNER_INSET,
      borderBottomWidth: CORNER_BORDER, borderLeftWidth: CORNER_BORDER,
      borderBottomLeftRadius: CORNER_RADIUS,
    },
  },
  {
    key: 'br',
    style: {
      bottom: CORNER_INSET, right: CORNER_INSET,
      borderBottomWidth: CORNER_BORDER, borderRightWidth: CORNER_BORDER,
      borderBottomRightRadius: CORNER_RADIUS,
    },
  },
] as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: {},
  header: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 4 },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 34,
    color: T.ink,
    letterSpacing: -0.5,
    marginTop: 6,
  },
  viewfinderWrap: { paddingHorizontal: 16, paddingTop: 14 },
  viewfinder: {
    height: 230,
    borderRadius: T.r,
    backgroundColor: '#EEE8DB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  guideFrame: {
    position: 'absolute',
    top: 24, left: 24, right: 24, bottom: 24,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(30,27,22,0.22)',
    borderStyle: 'dashed',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: T.ink,
    borderStyle: 'solid',
  },
  tip: {
    position: 'absolute',
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(30,27,22,0.70)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tipText: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 11,
    color: '#FBF8F2',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  sideBtn: { flex: 1 },
  shutter: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 4,
    borderColor: T.ink,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  shutterPressed: { transform: [{ scale: 0.95 }] },
  shutterInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueSection: { paddingHorizontal: 16, paddingTop: 26 },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  queueTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: T.ink,
  },
  doneCount: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 12.5,
    color: T.sage,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.line,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: T.ink,
    textAlign: 'center',
    marginBottom: 20,
  },
  sheetIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetBody: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: T.sub,
    textAlign: 'center',
  },
  sheetBold: {
    fontFamily: 'BeVietnamPro_700Bold',
    color: T.ink,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 18,
  },
  privacyText: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 12.5,
    color: T.sage,
  },
  sheetBtn: { width: '100%' },
  laterBtn: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  laterText: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 14,
    color: T.sub,
  },
});
