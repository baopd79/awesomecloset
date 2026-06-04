import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/lib/theme';

interface Props {
  count: number;
  required: number;
  onAdd: () => void;
}

export function SuggestionGateProgress({ count, required, onAdd }: Props) {
  const remaining = Math.max(required - count, 0);
  const pct = Math.min(Math.round((count / required) * 100), 100);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.lockIcon}>
          <Icon name="lock" size={19} color={T.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Sắp mở khóa gợi ý</Text>
          <Text style={styles.sub}>Thêm {remaining} món nữa để AI bắt đầu phối đồ</Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLeft}>
          <Text style={styles.metaStrong}>{count}</Text> / {required} món sẵn sàng
        </Text>
        <Text style={styles.metaRight}>{pct}%</Text>
      </View>

      <Pressable onPress={onAdd} style={styles.cta}>
        <Icon name="camera" size={18} color="#FBF8F2" />
        <Text style={styles.ctaText}>Thêm đồ vào tủ</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: T.surface,
    borderRadius: T.r,
    padding: 20,
    ...T.shadowLg,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  lockIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: T.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: T.ink },
  sub: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 12.5, color: T.sub, marginTop: 2 },
  barTrack: { height: 10, borderRadius: 999, backgroundColor: T.bg2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: T.accent },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  metaLeft: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 12, color: T.sub },
  metaStrong: { fontFamily: 'BeVietnamPro_700Bold', color: T.ink },
  metaRight: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 12, color: T.accent },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: T.ink,
    paddingVertical: 15,
    borderRadius: 999,
    marginTop: 16,
  },
  ctaText: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 16, color: '#FBF8F2', letterSpacing: 0.2 },
});
