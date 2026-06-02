import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { ClosetGrid } from '@/components/ClosetGrid';
import { FilterBar } from '@/components/FilterBar';
import { Icon } from '@/components/ui/Icon';
import { Kicker } from '@/components/ui/Kicker';
import { useCloset } from '@/hooks/useCloset';
import { T } from '@/lib/theme';

export default function ClosetScreen() {
  const router = useRouter();
  const { items, allItems, loading, category, setCategory, query, setQuery, archive, refresh } =
    useCloset();

  useFocusEffect(React.useCallback(() => { void refresh(); }, [refresh]));

  const readyCount = allItems.filter((i) => i.processing_status === 'ready').length;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ClosetGrid
        items={items}
        onArchive={archive}
        onRefresh={refresh}
        refreshing={loading}
        ListHeaderComponent={
          <View>
            {/* header */}
            <View style={styles.header}>
              <View>
                <Kicker>{readyCount} món</Kicker>
                <Text style={styles.title}>Tủ đồ</Text>
              </View>
              <Pressable style={styles.iconBtn}>
                <Icon name="filter" size={20} color={T.ink2} />
              </Pressable>
            </View>

            {/* search bar */}
            <View style={styles.searchWrap}>
              <Icon name="search" size={17} color={T.sub} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Tìm trong tủ đồ"
                placeholderTextColor={T.sub}
                style={styles.searchInput}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')}>
                  <Icon name="close" size={15} color={T.faint} />
                </Pressable>
              )}
            </View>

            {/* filter bar */}
            <FilterBar active={category} onChange={setCategory} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Đang tải…</Text>
            </View>
          ) : query || category !== 'all' ? (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Không tìm thấy món nào</Text>
              <Text style={styles.emptySub}>Thử bỏ bộ lọc hoặc từ khoá khác</Text>
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Tủ đồ đang trống</Text>
              <Text style={styles.emptySub}>Chụp món đầu tiên để bắt đầu</Text>
              <Pressable onPress={() => router.push('/(tabs)/add')} style={styles.ctaBtn}>
                <Icon name="plus" size={16} color="#fff" />
                <Text style={styles.ctaText}>Thêm đồ đầu tiên</Text>
              </Pressable>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 2,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 34,
    color: T.ink,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.line,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: T.surface,
    borderRadius: 999,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    ...T.shadow,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 15,
    color: T.ink,
    padding: 0,
  },
  center: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: T.ink,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 13.5,
    color: T.sub,
    marginTop: 6,
    textAlign: 'center',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 20,
  },
  ctaText: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },
});
