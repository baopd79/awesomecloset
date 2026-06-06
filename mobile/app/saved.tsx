import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Icon } from '@/components/ui/Icon';
import { IconBtn } from '@/components/ui/IconBtn';
import { listOutfits, type OutfitResponse } from '@/lib/api';
import { OCCASION_LABEL } from '@/lib/labels';
import { T } from '@/lib/theme';

export default function SavedScreen() {
  const router = useRouter();
  const [outfits, setOutfits] = useState<OutfitResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Refetch on focus so a new build (or an unsave from the detail screen) stays in sync.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      listOutfits({ saved: true })
        .then((res) => active && setOutfits(res))
        .catch(() => active && setOutfits([]))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <IconBtn name="back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Outfit đã lưu</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : outfits.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="heart" size={28} color={T.accent} />
          </View>
          <Text style={styles.emptyTitle}>Chưa lưu outfit nào</Text>
          <Text style={styles.emptySub}>
            Nhấn vào biểu tượng trái tim ở bất kỳ gợi ý nào để lưu lại xem sau.
          </Text>
          <View style={styles.emptyActions}>
            <Pressable style={styles.primaryBtn} onPress={() => router.navigate('/(tabs)')}>
              <Icon name="spark" size={16} color="#FBF8F2" />
              <Text style={styles.primaryText}>Xem gợi ý outfit</Text>
            </Pressable>
            <Pressable onPress={() => router.replace('/builder')}>
              <Text style={styles.linkText}>Hoặc tự phối thủ công</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.count}>{outfits.length} outfit bạn đã lưu</Text>
          <View style={styles.grid}>
            {outfits.map((o) => (
              <SavedCard key={o.id} outfit={o} onPress={() => router.push(`/outfit/${o.id}`)} />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SavedCard({ outfit, onPress }: { outfit: OutfitResponse; onPress: () => void }) {
  const title =
    outfit.name ??
    (outfit.occasion ? OCCASION_LABEL[outfit.occasion] ?? outfit.occasion : 'Outfit');
  const sub = outfit.ai_generated ? 'Gợi ý AI' : 'Tự phối';
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardImgWrap}>
        {outfit.collage_url ? (
          <Image source={{ uri: outfit.collage_url }} style={styles.cardImg} resizeMode="contain" />
        ) : (
          <Icon name="spark" size={28} color={T.faint} />
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.cardSub}>{sub}</Text>
      </View>
    </Pressable>
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

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 999,
    backgroundColor: T.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 23, color: T.ink, marginTop: 20 },
  emptySub: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: T.sub,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyActions: { alignItems: 'center', gap: 12, marginTop: 24 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: T.ink,
  },
  primaryText: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 16, color: '#FBF8F2', letterSpacing: 0.2 },
  linkText: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 14, color: T.accent },

  scroll: { paddingHorizontal: 16, paddingBottom: 30 },
  count: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 13, color: T.sub, paddingHorizontal: 6, paddingTop: 12, paddingBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48.5%',
    backgroundColor: T.surface,
    borderRadius: T.rsm,
    overflow: 'hidden',
    marginBottom: 12,
    ...T.shadow,
  },
  cardImgWrap: {
    height: 150,
    backgroundColor: T.ground,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  cardImg: { width: '100%', height: '100%' },
  cardInfo: { padding: 12 },
  cardName: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 15, color: T.ink },
  cardSub: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 11.5, color: T.sub, marginTop: 3 },
});
