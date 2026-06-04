import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { IconBtn } from '@/components/ui/IconBtn';
import { listItems, unarchiveItem, type ItemResponse } from '@/lib/api';
import { TYPE_LABEL } from '@/lib/labels';
import { T } from '@/lib/theme';

export default function ArchiveScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listItems({ limit: 100, is_archived: true });
      setItems(res.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = useCallback(
    async (id: string) => {
      setRestoring((prev) => new Set(prev).add(id));
      // Optimistic: drop from the archived list immediately.
      setItems((prev) => prev.filter((i) => i.id !== id));
      try {
        await unarchiveItem(id);
      } catch {
        void load(); // reload to restore accurate state on failure
      }
    },
    [load],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <IconBtn name="back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Đồ đã lưu trữ</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="archive" size={32} color={T.sub} />
          </View>
          <Text style={styles.emptyTitle}>Kho lưu trữ trống</Text>
          <Text style={styles.emptyBody}>
            Lưu trữ những món ít mặc để tủ đồ gọn gàng. Chúng vẫn ở đây khi bạn cần.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.count}>
            {items.length} món đang ẩn khỏi tủ đồ và gợi ý. Khôi phục bất cứ lúc nào.
          </Text>
          {items.map((it) => (
            <View key={it.id} style={styles.itemCard}>
              <View style={styles.thumb}>
                {it.thumbnail_url ? (
                  <Image source={{ uri: it.thumbnail_url }} style={styles.thumbImg} resizeMode="cover" />
                ) : (
                  <Icon name="closet" size={24} color={T.faint} />
                )}
              </View>
              <View style={styles.itemMeta}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {it.type ? (TYPE_LABEL[it.type] ?? it.type) : 'Món đồ'}
                </Text>
                {it.occasion && it.occasion.length > 0 && (
                  <Text style={styles.itemSub} numberOfLines={1}>
                    {it.occasion.join(' · ')}
                  </Text>
                )}
              </View>
              <Pressable
                style={styles.restoreBtn}
                disabled={restoring.has(it.id)}
                onPress={() => restore(it.id)}
              >
                <Icon name="retry" size={14} color={T.accent} />
                <Text style={styles.restoreText}>Khôi phục</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headerTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 19, color: T.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 999,
    backgroundColor: T.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 23, color: T.ink, marginTop: 20 },
  emptyBody: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: T.sub,
    textAlign: 'center',
    marginTop: 8,
  },

  scroll: { paddingHorizontal: 16, paddingBottom: 30 },
  count: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 13,
    color: T.sub,
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 14,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: T.surface,
    borderRadius: T.r,
    padding: 12,
    marginBottom: 12,
    ...T.shadow,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: T.rsm,
    backgroundColor: T.ground,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
  itemMeta: { flex: 1, minWidth: 0 },
  itemName: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 14, color: T.ink },
  itemSub: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 12, color: T.sub, marginTop: 2 },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.accentSoft,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  restoreText: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 12.5, color: T.accent },
});
