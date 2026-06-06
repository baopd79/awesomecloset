import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WearRatingSheet } from '@/components/WearRatingSheet';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import {
  getOutfit,
  saveOutfit,
  submitFeedback,
  unsaveOutfit,
  wearOutfit,
  type OutfitItem,
  type OutfitItemRole,
  type OutfitResponse,
} from '@/lib/api';
import { OCCASION_LABEL, TYPE_LABEL } from '@/lib/labels';
import { T } from '@/lib/theme';

const ROLE_LABEL: Record<OutfitItemRole, string> = {
  top: 'Áo',
  bottom: 'Quần / Váy',
  outerwear: 'Áo khoác',
  shoes: 'Giày',
  bag: 'Túi',
  accessory: 'Phụ kiện',
};

export default function OutfitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [outfit, setOutfit] = useState<OutfitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [wearOpen, setWearOpen] = useState(false);
  const [wearSubmitting, setWearSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const o = await getOutfit(id);
      setOutfit(o);
      setSaved(o.is_saved);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function handleSave() {
    if (!outfit) return;
    const next = !saved;
    setSaved(next);
    try {
      if (next) await saveOutfit(outfit.id);
      else await unsaveOutfit(outfit.id);
      toast.show(next ? 'Đã lưu vào bộ sưu tập' : 'Đã bỏ khỏi bộ sưu tập');
    } catch {
      setSaved(!next);
      toast.show('Có lỗi, thử lại nhé');
    }
  }

  function handleDislike() {
    if (!outfit) return;
    Alert.alert('Bỏ qua gợi ý này?', 'AI sẽ học để gợi ý hợp gu hơn.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Bỏ qua',
        style: 'destructive',
        onPress: async () => {
          await submitFeedback(outfit.id, 'disliked').catch(() => {});
          router.back();
        },
      },
    ]);
  }

  async function handleConfirmWear(rating: number | undefined) {
    if (!outfit) return;
    setWearSubmitting(true);
    try {
      await wearOutfit(outfit.id, rating);
      setWearOpen(false);
      router.back();
    } finally {
      setWearSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={T.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!outfit) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <Pressable onPress={() => router.back()} style={styles.backMargin}>
          <Icon name="back" size={22} color={T.ink} />
        </Pressable>
        <View style={styles.loadingWrap}>
          <Text style={styles.errorMsg}>Không tìm thấy outfit</Text>
        </View>
      </SafeAreaView>
    );
  }

  const occ = outfit.occasion ? OCCASION_LABEL[outfit.occasion] ?? outfit.occasion : 'Gợi ý';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* hero */}
        <View style={styles.hero}>
          <View style={styles.heroActions}>
            <Pressable onPress={() => router.back()} style={styles.iconBtn}>
              <Icon name="back" size={22} color={T.ink} />
            </Pressable>
            <Pressable onPress={handleSave} style={styles.iconBtn}>
              <Icon name="heart" size={22} color={saved ? T.accent : T.ink} />
            </Pressable>
          </View>
          <View style={styles.heroImg}>
            {outfit.collage_url ? (
              <Image source={{ uri: outfit.collage_url }} style={styles.img} resizeMode="contain" />
            ) : (
              <View style={styles.imgPlaceholder}>
                <Icon name="spark" size={40} color={T.faint} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.chip}>
            <Icon name="spark" size={12} color={T.sage} />
            <Text style={styles.chipText}>{occ}</Text>
          </View>
          {outfit.name && <Text style={styles.title}>{outfit.name}</Text>}

          {/* AI reasoning */}
          {outfit.ai_reasoning && (
            <View style={styles.reasonCard}>
              <Icon name="spark" size={20} color={T.accent} />
              <View style={styles.reasonTextWrap}>
                <Text style={styles.reasonLabel}>VÌ SAO AI CHỌN</Text>
                <Text style={styles.reasonText}>{outfit.ai_reasoning}</Text>
              </View>
            </View>
          )}

          {/* pieces */}
          <Text style={styles.sectionTitle}>{outfit.items.length} món trong outfit</Text>
          <View style={styles.piecesCard}>
            {outfit.items.map((item, i) => (
              <PieceRow
                key={item.item_id}
                item={item}
                last={i === outfit.items.length - 1}
                onPress={() => router.push(`/item/${item.item_id}`)}
              />
            ))}
          </View>

          {/* actions — dislike is AI-feedback only; hide it on self-built outfits */}
          <View style={styles.actions}>
            <Pressable style={styles.wearBtn} onPress={() => setWearOpen(true)}>
              <Icon name="wear" size={18} color="#FBF8F2" />
              <Text style={styles.wearText}>Mặc hôm nay</Text>
            </Pressable>
            {outfit.ai_generated && (
              <Pressable style={styles.dislikeBtn} onPress={handleDislike}>
                <Icon name="dislike" size={20} color={T.ink} />
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      <WearRatingSheet
        visible={wearOpen}
        submitting={wearSubmitting}
        onClose={() => setWearOpen(false)}
        onConfirm={handleConfirmWear}
      />
    </SafeAreaView>
  );
}

function PieceRow({
  item,
  last,
  onPress,
}: {
  item: OutfitItem;
  last: boolean;
  onPress: () => void;
}) {
  const uri = item.thumbnail_url ?? item.processed_url;
  const typeLabel = item.type ? TYPE_LABEL[item.type] ?? item.type : 'Món đồ';
  return (
    <Pressable onPress={onPress} style={[styles.pieceRow, !last && styles.pieceBorder]}>
      <View style={styles.pieceThumb}>
        {uri ? (
          <Image source={{ uri }} style={styles.pieceImg} resizeMode="contain" />
        ) : (
          <Icon name="closet" size={20} color={T.faint} />
        )}
      </View>
      <View style={styles.pieceMeta}>
        <Text style={styles.pieceName}>{typeLabel}</Text>
        <Text style={styles.pieceRole}>{ROLE_LABEL[item.role]}</Text>
      </View>
      <Icon name="chevron" size={16} color={T.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backMargin: { margin: 16 },
  errorMsg: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 14, color: T.danger },
  hero: { backgroundColor: T.ground, paddingTop: 8 },
  heroActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...T.shadow,
  },
  heroImg: { height: 280, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 24, paddingTop: 10 },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 22 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: T.sageSoft,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: { fontFamily: 'BeVietnamPro_700Bold', fontSize: 11, color: T.sage },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: T.ink, marginTop: 12, letterSpacing: -0.3 },
  reasonCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: T.accentSoft,
    borderRadius: T.rsm,
    padding: 16,
    marginTop: 16,
  },
  reasonTextWrap: { flex: 1 },
  reasonLabel: { fontFamily: 'BeVietnamPro_700Bold', fontSize: 12, color: T.accent, marginBottom: 4 },
  reasonText: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 13.5, lineHeight: 21, color: T.ink2 },
  sectionTitle: { fontFamily: 'BeVietnamPro_700Bold', fontSize: 14, color: T.ink, marginTop: 24, marginBottom: 12 },
  piecesCard: { backgroundColor: T.surface, borderRadius: T.rsm, paddingHorizontal: 4, ...T.shadow },
  pieceRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, paddingVertical: 11 },
  pieceBorder: { borderBottomWidth: 1, borderBottomColor: T.line },
  pieceThumb: {
    width: 50,
    height: 50,
    borderRadius: T.rsm,
    backgroundColor: T.ground,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 7,
  },
  pieceImg: { width: '100%', height: '100%' },
  pieceMeta: { flex: 1 },
  pieceName: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 13.5, color: T.ink },
  pieceRole: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 11, color: T.sub, letterSpacing: 1, textTransform: 'uppercase', marginTop: 3 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  wearBtn: {
    flex: 1,
    height: 50,
    borderRadius: 999,
    backgroundColor: T.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  wearText: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 16, color: '#FBF8F2', letterSpacing: 0.2 },
  dislikeBtn: {
    width: 50,
    height: 50,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: T.line,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
