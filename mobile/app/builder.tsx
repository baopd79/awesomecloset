import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/ui/Icon';
import { IconBtn } from '@/components/ui/IconBtn';
import { Kicker } from '@/components/ui/Kicker';
import { useToast } from '@/components/ui/Toast';
import {
  createOutfit,
  listItems,
  type ItemResponse,
  type OutfitItemRole,
} from '@/lib/api';
import { OCCASION_LABEL, TYPE_LABEL } from '@/lib/labels';
import { T } from '@/lib/theme';

// Slot → backend OutfitItemRole. Jacket/coat live in the "top" slot (no separate
// outerwear slot, per design); bag falls under the accessory slot.
type SlotRole = Extract<OutfitItemRole, 'top' | 'bottom' | 'shoes' | 'accessory'>;

interface Slot {
  role: SlotRole;
  label: string;
  types: string[];
  required: boolean;
}

const SLOTS: Slot[] = [
  { role: 'top', label: 'Áo', types: ['t_shirt', 'shirt', 'hoodie', 'sweater', 'jacket', 'coat', 'dress'], required: true },
  { role: 'bottom', label: 'Quần & Váy', types: ['pants', 'jeans', 'shorts', 'skirt'], required: true },
  { role: 'shoes', label: 'Giày', types: ['shoes', 'sneakers', 'boots'], required: false },
  { role: 'accessory', label: 'Phụ kiện', types: ['bag', 'accessory'], required: false },
];

const OCCASIONS = Object.entries(OCCASION_LABEL).map(([value, label]) => ({ value, label }));

function itemImg(item: ItemResponse): string | null {
  return item.thumbnail_url ?? item.processed_url;
}

export default function BuilderScreen() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<ItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Partial<Record<SlotRole, ItemResponse>>>({});
  const [pickerSlot, setPickerSlot] = useState<Slot | null>(null);
  const [name, setName] = useState('');
  const [occ, setOcc] = useState<string>('casual');
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listItems({ limit: 100, is_archived: false })
      .then((res) => setItems(res.items.filter((i) => i.processing_status === 'ready')))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const chosen = SLOTS.map((s) => picked[s.role]).filter(Boolean) as ItemResponse[];
  const canSave = !!picked.top && !!picked.bottom;
  const pickerItems = pickerSlot
    ? items.filter((i) => pickerSlot.types.includes(i.type ?? ''))
    : [];

  function pick(item: ItemResponse) {
    if (!pickerSlot) return;
    setPicked((p) => ({ ...p, [pickerSlot.role]: item }));
    setPickerSlot(null);
  }

  function clearSlot(role: SlotRole) {
    setPicked((p) => {
      const next = { ...p };
      delete next[role];
      return next;
    });
  }

  async function handleCreate() {
    if (!canSave || saving) return;
    setSaving(true);
    const ordered = SLOTS.filter((s) => picked[s.role]);
    try {
      await createOutfit({
        name: name.trim() || null,
        occasion: occ,
        items: ordered.map((s, idx) => ({
          item_id: picked[s.role]!.id,
          role: s.role,
          position: idx,
        })),
      });
      setSaveOpen(false);
      toast.show('Đã lưu outfit vào bộ sưu tập');
      router.replace('/saved');
    } catch {
      Alert.alert('Lỗi', 'Không lưu được outfit. Thử lại nhé.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <IconBtn name="back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Tự phối outfit</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* live preview */}
          {chosen.length === 0 ? (
            <View style={styles.previewEmpty}>
              <Icon name="spark" size={28} color={T.faint} />
              <Text style={styles.previewEmptyText}>Chọn món bên dưới để xem trước</Text>
            </View>
          ) : (
            <View style={styles.previewCard}>
              {chosen.map((item) => {
                const uri = itemImg(item);
                return (
                  <View key={item.id} style={styles.previewItem}>
                    {uri ? (
                      <Image source={{ uri }} style={styles.previewImg} resizeMode="contain" />
                    ) : (
                      <Icon name="closet" size={22} color={T.faint} />
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* slots */}
          <View style={styles.slots}>
            {SLOTS.map((slot) => (
              <BuilderSlot
                key={slot.role}
                slot={slot}
                item={picked[slot.role]}
                onPick={() => setPickerSlot(slot)}
                onClear={() => clearSlot(slot.role)}
              />
            ))}
          </View>

          {/* save bar */}
          <View style={styles.saveBar}>
            <Pressable
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              disabled={!canSave}
              onPress={() => setSaveOpen(true)}
            >
              <Icon name="check" size={18} color="#FBF8F2" />
              <Text style={styles.saveBtnText}>Lưu outfit ({chosen.length} món)</Text>
            </Pressable>
            {!canSave && (
              <Text style={styles.hint}>Cần ít nhất 1 áo và 1 quần/váy</Text>
            )}
          </View>
        </ScrollView>
      )}

      {/* item picker sheet */}
      <Modal
        visible={!!pickerSlot}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerSlot(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerSlot(null)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>
            Chọn {pickerSlot?.label.toLowerCase()}
          </Text>
          {pickerItems.length === 0 ? (
            <Text style={styles.sheetEmpty}>Tủ đồ chưa có món nào nhóm này</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerScroll}>
              <View style={styles.pickerGrid}>
                {pickerItems.map((item) => {
                  const uri = itemImg(item);
                  const on = pickerSlot && picked[pickerSlot.role]?.id === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => pick(item)}
                      style={[styles.pickerCell, on && styles.pickerCellOn]}
                    >
                      <View style={styles.pickerImgWrap}>
                        {uri ? (
                          <Image source={{ uri }} style={styles.pickerImg} resizeMode="contain" />
                        ) : (
                          <Icon name="closet" size={20} color={T.faint} />
                        )}
                      </View>
                      <Text style={styles.pickerLabel} numberOfLines={1}>
                        {TYPE_LABEL[item.type ?? ''] ?? 'Món đồ'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* save sheet: name + occasion */}
      <Modal
        visible={saveOpen}
        transparent
        animationType="slide"
        onRequestClose={() => (saving ? undefined : setSaveOpen(false))}
      >
        <Pressable style={styles.backdrop} onPress={() => (saving ? undefined : setSaveOpen(false))} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Đặt tên outfit</Text>
          <View style={styles.nameRow}>
            <Icon name="edit" size={18} color={T.sub} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="VD: Đi cà phê cuối tuần"
              placeholderTextColor={T.sub}
              style={styles.nameInput}
            />
          </View>
          <Kicker style={styles.occKicker}>Dịp</Kicker>
          <View style={styles.occWrap}>
            {OCCASIONS.map((o) => (
              <Pressable
                key={o.value}
                onPress={() => setOcc(o.value)}
                style={[styles.pill, occ === o.value && styles.pillActive]}
              >
                <Text style={[styles.pillText, occ === o.value && styles.pillTextActive]}>
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[styles.confirm, saving && styles.saveBtnDisabled]}
            disabled={saving}
            onPress={handleCreate}
          >
            {saving ? (
              <ActivityIndicator color="#FBF8F2" />
            ) : (
              <Text style={styles.confirmText}>Lưu vào bộ sưu tập</Text>
            )}
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function BuilderSlot({
  slot,
  item,
  onPick,
  onClear,
}: {
  slot: Slot;
  item: ItemResponse | undefined;
  onPick: () => void;
  onClear: () => void;
}) {
  const uri = item ? itemImg(item) : null;
  return (
    <Pressable onPress={onPick} style={[styles.slot, item ? styles.slotFilled : styles.slotEmpty]}>
      <View style={styles.slotThumb}>
        {item ? (
          uri ? (
            <Image source={{ uri }} style={styles.slotImg} resizeMode="contain" />
          ) : (
            <Icon name="closet" size={22} color={T.faint} />
          )
        ) : (
          <Icon name="plus" size={22} color={T.faint} />
        )}
      </View>
      <View style={styles.slotMeta}>
        <View style={styles.slotLabelRow}>
          <Text style={styles.slotLabel}>{slot.label}</Text>
          {slot.required && (
            <View style={styles.reqBadge}>
              <Text style={styles.reqText}>BẮT BUỘC</Text>
            </View>
          )}
        </View>
        <Text style={styles.slotSub}>
          {item ? (TYPE_LABEL[item.type ?? ''] ?? 'Món đồ') : 'Chạm để chọn món'}
        </Text>
      </View>
      {item ? (
        <Pressable
          onPress={onClear}
          hitSlop={8}
          style={styles.slotClear}
        >
          <Icon name="close" size={15} color={T.sub} />
        </Pressable>
      ) : (
        <Icon name="chevron" size={18} color={T.faint} />
      )}
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
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },

  previewEmpty: {
    height: 200,
    marginHorizontal: 22,
    marginTop: 8,
    borderRadius: T.r,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: T.line,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  previewEmptyText: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 13.5, color: T.faint },
  previewCard: {
    minHeight: 200,
    marginHorizontal: 22,
    marginTop: 8,
    borderRadius: T.r,
    backgroundColor: T.ground,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  previewItem: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  previewImg: { width: '100%', height: '100%' },

  slots: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: T.surface,
    borderRadius: T.r,
    padding: 12,
    borderWidth: 1.5,
    ...T.shadow,
  },
  slotFilled: { borderColor: T.line },
  slotEmpty: { borderColor: T.line, borderStyle: 'dashed' },
  slotThumb: {
    width: 66,
    height: 66,
    borderRadius: T.rsm,
    backgroundColor: T.ground,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 9,
  },
  slotImg: { width: '100%', height: '100%' },
  slotMeta: { flex: 1 },
  slotLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  slotLabel: { fontFamily: 'BeVietnamPro_700Bold', fontSize: 13.5, color: T.ink },
  reqBadge: { backgroundColor: T.accentSoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  reqText: { fontFamily: 'BeVietnamPro_700Bold', fontSize: 9, color: T.accent, letterSpacing: 0.3 },
  slotSub: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 12.5, color: T.sub, marginTop: 3 },
  slotClear: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: T.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveBar: { paddingHorizontal: 22, paddingTop: 24 },
  saveBtn: {
    height: 50,
    borderRadius: 999,
    backgroundColor: T.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 16, color: '#FBF8F2', letterSpacing: 0.2 },
  hint: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 12, color: T.faint, textAlign: 'center', marginTop: 10 },

  // sheets
  backdrop: { flex: 1, backgroundColor: 'rgba(30,27,22,0.45)' },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: T.r,
    borderTopRightRadius: T.r,
    padding: 22,
    paddingBottom: 36,
    maxHeight: '76%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: T.line, marginBottom: 16 },
  sheetTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: T.ink, marginBottom: 14 },
  sheetEmpty: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 13.5, color: T.sub, textAlign: 'center', paddingVertical: 18 },

  pickerScroll: { marginHorizontal: -2 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pickerCell: {
    width: '31%',
    borderRadius: T.rsm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
    backgroundColor: T.bg,
  },
  pickerCellOn: { borderColor: T.accent },
  pickerImgWrap: {
    aspectRatio: 1,
    backgroundColor: T.ground,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  pickerImg: { width: '100%', height: '100%' },
  pickerLabel: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 10.5,
    color: T.ink,
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: T.bg,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginBottom: 18,
  },
  nameInput: { flex: 1, fontFamily: 'BeVietnamPro_400Regular', fontSize: 15, color: T.ink, padding: 0 },
  occKicker: { marginBottom: 10 },
  occWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: T.bg2,
  },
  pillActive: { backgroundColor: T.accentSoft },
  pillText: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 13, color: T.ink2 },
  pillTextActive: { color: T.accent },
  confirm: {
    height: 50,
    borderRadius: 999,
    backgroundColor: T.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 16, color: '#FBF8F2', letterSpacing: 0.2 },
});
