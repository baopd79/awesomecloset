import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Kicker } from '@/components/ui/Kicker';
import { T } from '@/lib/theme';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface Props {
  streak: number;
  /** Monday-first 7-day window: which weekdays this week have a recorded view. */
  week: boolean[];
}

/** "Chuỗi phối đồ" card — consecutive-day streak + this week's activity row. */
export function StreakBadge({ streak, week }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <View style={styles.headLeft}>
          <Text style={styles.num}>{streak}</Text>
          <Text style={styles.unit}>ngày liên tiếp</Text>
          <Text style={styles.fire}>🔥</Text>
        </View>
      </View>
      <Kicker style={styles.kicker}>Chuỗi phối đồ của bạn</Kicker>

      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => {
          const active = week[i];
          return (
            <View key={d} style={styles.dayCol}>
              <View style={[styles.cell, active && styles.cellActive]}>
                {active && <Icon name="check" size={15} color="#FBF8F2" strokeWidth={2.4} />}
              </View>
              <Text style={styles.dayLabel}>{d}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: T.surface,
    borderRadius: T.r,
    padding: 16,
    ...T.shadow,
  },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  num: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30, color: T.ink },
  unit: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 13, color: T.ink },
  fire: { fontSize: 17 },
  kicker: { marginTop: 4 },
  week: { flexDirection: 'row', gap: 7, marginTop: 14 },
  dayCol: { flex: 1, alignItems: 'center' },
  cell: {
    width: '100%',
    height: 30,
    borderRadius: 8,
    backgroundColor: T.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { backgroundColor: T.accent },
  dayLabel: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 10, color: T.faint, marginTop: 4 },
});
