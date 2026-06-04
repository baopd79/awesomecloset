import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** One-time celebration shown the first time the closet reaches 15 ready items. */
export function FirstClosetBadge({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.medal}>
            <Icon name="check" size={40} color="#FBF8F2" strokeWidth={2.6} />
          </View>
          <Text style={styles.kicker}>HUY HIỆU MỚI</Text>
          <Text style={styles.title}>Tủ đồ đầu tiên</Text>
          <Text style={styles.sub}>
            Bạn đã thêm đủ 15 món — AI giờ có thể phối đồ cho bạn mỗi sáng. Cùng tạo gợi ý đầu tiên
            nhé!
          </Text>
          <Pressable style={styles.cta} onPress={onClose}>
            <Text style={styles.ctaText}>Tuyệt vời</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,27,22,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    backgroundColor: T.surface,
    borderRadius: T.r,
    padding: 28,
    alignItems: 'center',
    ...T.shadowLg,
  },
  medal: {
    width: 84,
    height: 84,
    borderRadius: 999,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  kicker: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 11,
    letterSpacing: 2,
    color: T.accent,
  },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: T.ink, marginTop: 6 },
  sub: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: T.sub,
    textAlign: 'center',
    marginTop: 12,
  },
  cta: {
    height: 50,
    alignSelf: 'stretch',
    borderRadius: 999,
    backgroundColor: T.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  ctaText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 16,
    color: '#FBF8F2',
    letterSpacing: 0.2,
  },
});
