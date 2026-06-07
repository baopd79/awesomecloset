import React, { useCallback, useEffect, useState } from 'react';
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
import { EditTagsSheet } from '@/components/EditTagsSheet';
import { Icon } from '@/components/ui/Icon';
import { Kicker } from '@/components/ui/Kicker';
import { PrimaryBtn } from '@/components/ui/PrimaryBtn';
import { useToast } from '@/components/ui/Toast';
import { useRealtimeItem } from '@/hooks/useRealtimeItem';
import {
  archiveItem,
  deleteItem,
  getItem,
  requestTagging,
  retryItem,
  type ItemResponse,
} from '@/lib/api';
import {
  OCCASION_LABEL,
  SEASON_LABEL,
  STYLE_LABEL,
  TYPE_LABEL,
  fmtWornCount,
} from '@/lib/labels';
import { T } from '@/lib/theme';

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ItemResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [tagging, setTagging] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getItem(id);
      setItem(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Silent refresh (no full-screen spinner) — used when realtime reports a state change.
  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      setItem(await getItem(id));
    } catch {
      // keep the current view; a later refresh or focus will reconcile
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  // Re-fetch when the server pushes a processing/tag_status change (e.g. AI tagging finished).
  useRealtimeItem(id ?? null, useCallback(() => { void refresh(); }, [refresh]));

  async function handleRequestTagging() {
    if (!item || tagging) return;
    setTagging(true);
    try {
      const updated = await requestTagging(item.id);
      setItem(updated); // tag_status -> tagging; realtime delivers the result
    } catch {
      toast.show('Không gắn thẻ được, thử lại nhé');
    } finally {
      setTagging(false);
    }
  }

  function handleRetag() {
    if (!item || tagging) return;
    Alert.alert('Gắn lại bằng AI?', 'AI sẽ gắn thẻ mới, ghi đè thẻ hiện tại (thẻ tự do giữ nguyên).', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Gắn lại', onPress: () => void handleRequestTagging() },
    ]);
  }

  async function handleArchive() {
    if (!item || archiving) return;
    setArchiving(true);
    try {
      await archiveItem(item.id);
      router.back();
    } finally {
      setArchiving(false);
    }
  }

  async function handleRetry() {
    if (!item || retrying) return;
    setRetrying(true);
    try {
      const updated = await retryItem(item.id);
      setItem(updated);
    } finally {
      setRetrying(false);
    }
  }

  function handleDelete() {
    if (!item || deleting) return;
    Alert.alert('Xoá món này?', 'Món đồ sẽ bị xoá khỏi tủ và không thể khôi phục.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteItem(item.id);
            router.back();
          } catch {
            setDeleting(false);
          }
        },
      },
    ]);
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

  if (!item) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="back" size={22} color={T.ink} />
        </Pressable>
        <View style={styles.loadingWrap}>
          <Text style={styles.errorMsg}>Không tìm thấy món đồ</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isReady = item.processing_status === 'ready';
  const isFailed = item.processing_status === 'failed';
  const imageUri = item.processed_url ?? item.thumbnail_url ?? item.original_url;
  const typeLabel = item.type ? (TYPE_LABEL[item.type] ?? item.type) : null;
  const seasonLabel = item.season?.map((s) => SEASON_LABEL[s] ?? s).join(', ');
  const occasions = item.occasion?.map((o) => OCCASION_LABEL[o] ?? o) ?? [];
  const styles2 = item.style?.map((s) => STYLE_LABEL[s] ?? s) ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* hero */}
        <View style={styles.hero}>
          <View style={styles.heroActions}>
            <Pressable onPress={() => router.back()} style={styles.iconBtn}>
              <Icon name="back" size={22} color={T.ink} />
            </Pressable>
            <View style={styles.heroRightActions}>
              <Pressable onPress={handleArchive} style={styles.iconBtn} disabled={archiving}>
                {archiving ? (
                  <ActivityIndicator size="small" color={T.ink2} />
                ) : (
                  <Icon name="archive" size={22} color={T.ink} />
                )}
              </Pressable>
              <Pressable onPress={handleDelete} style={styles.iconBtn} disabled={deleting}>
                {deleting ? (
                  <ActivityIndicator size="small" color={T.danger} />
                ) : (
                  <Icon name="trash" size={22} color={T.danger} />
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.heroImg}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.img}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.imgPlaceholder}>
                <Icon name="closet" size={40} color={T.faint} />
              </View>
            )}
          </View>
        </View>

        {/* body */}
        <View style={styles.body}>
          {typeLabel && seasonLabel && (
            <Kicker>{typeLabel} · {seasonLabel}</Kicker>
          )}

          <Text style={styles.title}>
            {isFailed ? 'Xử lý thất bại' : isReady ? (typeLabel ?? 'Món đồ') : 'Đang xử lý…'}
          </Text>

          <Text style={styles.wornText}>{fmtWornCount(item.wear_count)}</Text>

          {/* retry / improve cutout button */}
          {isFailed && (
            <Pressable
              onPress={handleRetry}
              disabled={retrying}
              style={styles.retryBtn}
            >
              {retrying ? (
                <ActivityIndicator size="small" color={T.accent} />
              ) : (
                <Icon name="spark" size={15} color={T.accent} />
              )}
              <Text style={styles.retryText}>
                Thử lại
              </Text>
            </Pressable>
          )}

          {/* failed error */}
          {isFailed && item.processing_error && (
            <Text style={styles.errorMsg}>{item.processing_error}</Text>
          )}

          {/* processing status */}
          {!isReady && !isFailed && (
            <>
              <View style={styles.processingRow}>
                <ActivityIndicator size="small" color={T.accent} />
                <Text style={styles.processingText}>
                  {item.processing_status === 'removing_bg'
                    ? 'Đang tách nền…'
                    : item.processing_status === 'tagging'
                    ? 'AI đang gắn thẻ…'
                    : 'Đang chờ xử lý…'}
                </Text>
              </View>
              {/* escape hatch for items stuck in a processing state */}
              <Pressable onPress={handleRetry} disabled={retrying} style={styles.retryBtn}>
                {retrying ? (
                  <ActivityIndicator size="small" color={T.accent} />
                ) : (
                  <Icon name="retry" size={15} color={T.accent} />
                )}
                <Text style={styles.retryText}>Xử lý lâu? Thử lại</Text>
              </Pressable>
            </>
          )}

          {isReady && (
            <>
              {/* tagging — branches on tag_status */}
              {item.tag_status === 'tagged' ? (
                <>
                  {/* colors */}
                  {Array.isArray(item.colors) && item.colors.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Màu sắc</Text>
                      <View style={styles.tagRow}>
                        {(
                          item.colors as Array<{ hex: string; name: string; dominant?: boolean }>
                        ).map((c, i) => (
                          <View key={i} style={styles.tagChip}>
                            <View style={[styles.swatch, { backgroundColor: c.hex }]} />
                            <Text style={styles.tagText}>
                              {c.name}{c.dominant ? ' · chủ đạo' : ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {/* tags */}
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitleInline}>Thẻ gắn</Text>
                    <View style={styles.headerActions}>
                      <Pressable onPress={() => setEditOpen(true)} hitSlop={8} style={styles.editBtn}>
                        <Icon name="edit" size={15} color={T.accent} />
                        <Text style={styles.editText}>Sửa</Text>
                      </Pressable>
                      <Pressable onPress={handleRetag} hitSlop={8} style={styles.editBtn}>
                        <Icon name="spark" size={15} color={T.accent} />
                        <Text style={styles.editText}>Gắn lại AI</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.tagRow}>
                    {typeLabel && <TagChip>{typeLabel}</TagChip>}
                    {occasions.map((o) => <TagChip key={o}>{o}</TagChip>)}
                    {seasonLabel && <TagChip>{seasonLabel}</TagChip>}
                    {styles2.map((s) => <TagChip key={s}>{s}</TagChip>)}
                    {(item.custom_tags ?? []).map((t) => <TagChip key={t}>{t}</TagChip>)}
                  </View>
                </>
              ) : item.tag_status === 'tagging' ? (
                <View style={[styles.processingRow, { marginTop: 24 }]}>
                  <ActivityIndicator size="small" color={T.accent} />
                  <Text style={styles.processingText}>AI đang gắn thẻ…</Text>
                </View>
              ) : (
                <View style={styles.tagPrompt}>
                  <View style={styles.tagPromptIcon}>
                    <Icon name="spark" size={20} color={T.accent} />
                  </View>
                  <Text style={styles.tagPromptTitle}>
                    {item.tag_status === 'tag_failed' ? 'Gắn thẻ chưa xong' : 'Chưa gắn thẻ'}
                  </Text>
                  <Text style={styles.tagPromptSub}>
                    {item.tag_status === 'tag_failed'
                      ? 'AI gắn thẻ chưa được — thử lại hoặc gắn thủ công.'
                      : 'Để AI gắn thẻ tự động, hoặc tự gắn để dùng trong gợi ý.'}
                  </Text>
                  <PrimaryBtn
                    icon="spark"
                    style={styles.tagAiBtn}
                    onPress={handleRequestTagging}
                    disabled={tagging}
                  >
                    {tagging
                      ? 'Đang gửi…'
                      : item.tag_status === 'tag_failed'
                      ? 'Thử lại bằng AI'
                      : 'Để AI gắn thẻ'}
                  </PrimaryBtn>
                  <Pressable onPress={() => setEditOpen(true)} style={styles.tagManualBtn}>
                    <Text style={styles.tagManualText}>Gắn thủ công</Text>
                  </Pressable>
                </View>
              )}

              {/* wear history */}
              <Text style={styles.sectionTitle}>Lịch sử mặc</Text>
              {item.wear_count === 0 ? (
                <View style={styles.historyEmpty}>
                  <View style={styles.historyIcon}>
                    <Icon name="spark" size={18} color={T.accent} />
                  </View>
                  <View>
                    <Text style={styles.historyTitle}>Món này còn "ngủ quên"</Text>
                    <Text style={styles.historySub}>Thử đưa vào gợi ý hôm nay nhé</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.historyCard}>
                  <Text style={styles.historySub}>Đã mặc {item.wear_count} lần</Text>
                </View>
              )}

              {/* CTA */}
              <Pressable style={styles.cta}>
                <Icon name="spark" size={16} color="#fff" />
                <Text style={styles.ctaText}>Phối đồ với món này</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      <EditTagsSheet
        visible={editOpen}
        item={item}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setItem(updated);
          toast.show('Đã cập nhật thẻ');
        }}
      />
    </SafeAreaView>
  );
}

function TagChip({ children }: { children: string }) {
  return (
    <View style={styles.tagChip}>
      <Text style={styles.tagText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: T.ground, paddingTop: 8 },
  heroActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  heroRightActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...T.shadow,
  },
  backBtn: { margin: 16 },
  heroImg: {
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 24,
    paddingTop: 10,
  },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  body: { padding: 22, paddingTop: 22 },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: T.ink,
    marginTop: 8,
    letterSpacing: -0.3,
  },
  wornText: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 13.5,
    color: T.sub,
    marginTop: 6,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: T.line,
    backgroundColor: T.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
    ...T.shadow,
  },
  retryText: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 13,
    color: T.ink2,
  },
  errorMsg: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 13,
    color: T.danger,
    marginTop: 8,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  processingText: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 14,
    color: T.sub,
  },
  sectionTitle: {
    fontFamily: 'BeVietnamPro_700Bold',
    fontSize: 14,
    color: T.ink,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitleInline: {
    fontFamily: 'BeVietnamPro_700Bold',
    fontSize: 14,
    color: T.ink,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  editText: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 13,
    color: T.accent,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  tagPrompt: {
    marginTop: 24,
    backgroundColor: T.surface,
    borderRadius: T.rsm,
    padding: 20,
    alignItems: 'center',
    ...T.shadow,
  },
  tagPromptIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tagPromptTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 18,
    color: T.ink,
  },
  tagPromptSub: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: T.sub,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  tagAiBtn: { width: '100%' },
  tagManualBtn: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  tagManualText: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 14,
    color: T.sub,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.bg2,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
  },
  swatch: {
    width: 11,
    height: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.line,
  },
  tagText: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 12.5,
    color: T.ink2,
  },
  historyEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.surface,
    borderRadius: T.rsm,
    padding: 16,
    ...T.shadow,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: T.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 13.5,
    color: T.ink,
  },
  historyCard: {
    backgroundColor: T.surface,
    borderRadius: T.rsm,
    padding: 16,
    ...T.shadow,
  },
  historySub: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 12,
    color: T.sub,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: T.accent,
    paddingVertical: 16,
    borderRadius: T.r,
    marginTop: 24,
    marginBottom: 16,
  },
  ctaText: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },
});
