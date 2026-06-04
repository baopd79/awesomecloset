import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Kicker } from '@/components/ui/Kicker';
import { type ManualCondition } from '@/lib/api';
import { OCCASION_LABEL } from '@/lib/labels';
import { T } from '@/lib/theme';

const OCCASIONS = ['work', 'casual', 'party', 'date', 'school', 'travel'] as const;

const WEATHER_OPTS: { key: ManualCondition | 'auto'; label: string }[] = [
  { key: 'auto', label: 'Tự động' },
  { key: 'hot', label: 'Nóng' },
  { key: 'warm', label: 'Ấm' },
  { key: 'cool', label: 'Mát' },
  { key: 'cold', label: 'Lạnh' },
  { key: 'rainy', label: 'Mưa' },
];

interface Props {
  occasion: string | null;
  onOccasion: (o: string) => void;
  manualCondition: ManualCondition | null;
  onManualCondition: (c: ManualCondition | null) => void;
}

export function OccasionSelector({
  occasion,
  onOccasion,
  manualCondition,
  onManualCondition,
}: Props) {
  return (
    <View>
      <Kicker style={styles.kicker}>Hoàn cảnh</Kicker>
      <View style={styles.wrap}>
        {OCCASIONS.map((o) => {
          const active = occasion === o;
          return (
            <Pressable
              key={o}
              onPress={() => onOccasion(o)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {OCCASION_LABEL[o]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Kicker style={styles.kicker}>Thời tiết</Kicker>
      <View style={styles.wrap}>
        {WEATHER_OPTS.map(({ key, label }) => {
          const active = key === 'auto' ? manualCondition === null : manualCondition === key;
          return (
            <Pressable
              key={key}
              onPress={() => onManualCondition(key === 'auto' ? null : key)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { marginTop: 18, marginBottom: 10, paddingHorizontal: 22 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 22 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: T.line,
    backgroundColor: T.surface,
  },
  pillActive: { borderColor: T.accent, backgroundColor: T.accentSoft },
  pillText: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 13.5, color: T.ink2 },
  pillTextActive: { color: T.accent },
});
