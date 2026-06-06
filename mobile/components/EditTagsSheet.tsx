import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Kicker } from '@/components/ui/Kicker';
import { Pill } from '@/components/ui/Pill';
import { PrimaryBtn } from '@/components/ui/PrimaryBtn';
import { updateTags, type ItemResponse } from '@/lib/api';
import {
  OCCASION_LABEL,
  OCCASION_VALUES,
  SEASON_LABEL,
  SEASON_VALUES,
  STYLE_LABEL,
  STYLE_VALUES,
  TYPE_LABEL,
  TYPE_VALUES,
} from '@/lib/labels';
import { T } from '@/lib/theme';

const MAX_CUSTOM_TAGS = 20;
const MAX_TAG_LEN = 50;

interface Props {
  visible: boolean;
  item: ItemResponse;
  onClose: () => void;
  onSaved: (updated: ItemResponse) => void;
}

export function EditTagsSheet({ visible, item, onClose, onSaved }: Props) {
  const [type, setType] = useState<string | null>(null);
  const [style, setStyle] = useState<string[]>([]);
  const [season, setSeason] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset form from the item each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setType(item.type ?? null);
    setStyle(item.style ?? []);
    setSeason(item.season?.[0] ?? null);
    setOccasion(item.occasion ?? []);
    setCustomTags(item.custom_tags ?? []);
    setDraft('');
  }, [visible, item]);

  const toggleMulti = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const addCustomTag = () => {
    const tag = draft.trim();
    if (!tag) return;
    if (tag.length > MAX_TAG_LEN || customTags.length >= MAX_CUSTOM_TAGS) return;
    if (!customTags.includes(tag)) setCustomTags([...customTags, tag]);
    setDraft('');
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await updateTags(item.id, {
        type,
        style,
        season: season ? [season] : [],
        occasion,
        custom_tags: customTags,
      });
      onSaved(updated);
      onClose();
    } catch {
      // Keep the sheet open so the user can retry without losing their edits.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Sửa thẻ gắn</Text>

          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Kicker style={styles.kicker}>Loại</Kicker>
            <View style={styles.pills}>
              {TYPE_VALUES.map((v) => (
                <Pill key={v} selected={type === v} onPress={() => setType(type === v ? null : v)}>
                  {TYPE_LABEL[v]}
                </Pill>
              ))}
            </View>

            <Kicker style={styles.kicker}>Phong cách</Kicker>
            <View style={styles.pills}>
              {STYLE_VALUES.map((v) => (
                <Pill
                  key={v}
                  selected={style.includes(v)}
                  onPress={() => toggleMulti(style, setStyle, v)}
                >
                  {STYLE_LABEL[v]}
                </Pill>
              ))}
            </View>

            <Kicker style={styles.kicker}>Mùa</Kicker>
            <View style={styles.pills}>
              {SEASON_VALUES.map((v) => (
                <Pill
                  key={v}
                  selected={season === v}
                  onPress={() => setSeason(season === v ? null : v)}
                >
                  {SEASON_LABEL[v]}
                </Pill>
              ))}
            </View>

            <Kicker style={styles.kicker}>Dịp</Kicker>
            <View style={styles.pills}>
              {OCCASION_VALUES.map((v) => (
                <Pill
                  key={v}
                  selected={occasion.includes(v)}
                  onPress={() => toggleMulti(occasion, setOccasion, v)}
                >
                  {OCCASION_LABEL[v]}
                </Pill>
              ))}
            </View>

            <Kicker style={styles.kicker}>Thẻ tự do</Kicker>
            {customTags.length > 0 && (
              <View style={styles.pills}>
                {customTags.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => setCustomTags(customTags.filter((t) => t !== tag))}
                    style={styles.customChip}
                  >
                    <Text style={styles.customChipText}>{tag}</Text>
                    <Icon name="close" size={13} color={T.sub} />
                  </Pressable>
                ))}
              </View>
            )}
            <View style={styles.tagInputRow}>
              <TextInput
                style={styles.tagInput}
                value={draft}
                onChangeText={setDraft}
                placeholder="Thêm thẻ riêng (vd: hàng hiệu)"
                placeholderTextColor={T.faint}
                maxLength={MAX_TAG_LEN}
                returnKeyType="done"
                onSubmitEditing={addCustomTag}
                autoCorrect={false}
              />
              <Pressable
                onPress={addCustomTag}
                disabled={!draft.trim() || customTags.length >= MAX_CUSTOM_TAGS}
                style={styles.tagAddBtn}
              >
                <Icon name="plus" size={18} color={T.accent} />
              </Pressable>
            </View>

            <View style={{ height: 12 }} />
          </ScrollView>

          <PrimaryBtn style={styles.saveBtn} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#FBF8F2" /> : 'Lưu thay đổi'}
          </PrimaryBtn>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.line,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: T.ink,
    marginBottom: 8,
  },
  body: { flexGrow: 0 },
  kicker: { marginTop: 18, marginBottom: 10 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: T.bg2,
  },
  customChipText: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 12.5,
    color: T.ink2,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  tagInput: {
    flex: 1,
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 14,
    color: T.ink,
    backgroundColor: T.bg2,
    borderRadius: T.rsm,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  tagAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.accentSoft,
  },
  saveBtn: { width: '100%', marginTop: 16 },
});
