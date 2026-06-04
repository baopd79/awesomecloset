import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/lib/theme';

interface Props {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (rating: number | undefined) => void;
}

/** Bottom sheet shown after "Mặc hôm nay": optional 1–5 star rating before logging the wear. */
export function WearRatingSheet({ visible, submitting, onClose, onConfirm }: Props) {
  const [rating, setRating] = useState(0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={submitting ? undefined : onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Đã mặc outfit này!</Text>
        <Text style={styles.sub}>
          Bạn thấy outfit hôm nay thế nào? Đánh giá giúp AI gợi ý hợp gu hơn.
        </Text>

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
              <Icon name="star" size={34} color={n <= rating ? T.star : T.line} />
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.confirm, submitting && styles.disabled]}
          disabled={submitting}
          onPress={() => onConfirm(rating > 0 ? rating : undefined)}
        >
          <Text style={styles.confirmText}>Lưu nhật ký mặc</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,27,22,0.45)' },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: T.r,
    borderTopRightRadius: T.r,
    padding: 24,
    paddingBottom: 40,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: T.line, marginBottom: 18 },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: T.ink },
  sub: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 13.5, color: T.sub, marginTop: 8 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 24 },
  confirm: {
    height: 50,
    borderRadius: 999,
    backgroundColor: T.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  confirmText: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 16, color: '#FBF8F2', letterSpacing: 0.2 },
});
