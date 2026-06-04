import { useRouter } from 'expo-router';
import { useMemo } from 'react';
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
import { Icon } from '@/components/ui/Icon';
import { Kicker } from '@/components/ui/Kicker';
import { useAnalytics } from '@/hooks/useAnalytics';
import { type ColorStat, type HistoryEntry, type UnwornItem } from '@/lib/api';
import { OCCASION_LABEL, TYPE_LABEL } from '@/lib/labels';
import { T } from '@/lib/theme';

// Per-occasion calendar tint (keys = backend occasion enum values).
const OCC_COLOR: Record<string, string> = {
  work: '#5B6B85',
  school: '#7A8A6A',
  casual: '#A2543B',
  party: '#7A5A6E',
  date: '#C98B86',
  travel: '#5F7E64',
};

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function AnalyticsScreen() {
  const router = useRouter();
  const { summary, colors, unworn, history, loading, error, refetch } = useAnalytics();

  const now = new Date();
  const monthLabel = `Tháng ${now.getMonth() + 1} · ${now.getFullYear()}`;

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={T.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.errText}>Không tải được thống kê</Text>
          <Pressable style={styles.retry} onPress={refetch}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={styles.header}>
          <Kicker>{monthLabel}</Kicker>
          <Text style={styles.title}>Thống kê</Text>
        </View>

        {/* summary stats */}
        <View style={styles.stats}>
          {[
            [summary?.items_count ?? 0, 'món đồ'],
            [summary?.outfits_count ?? 0, 'outfit'],
            [summary?.worn_days ?? 0, 'ngày mặc'],
          ].map(([n, l]) => (
            <View key={l} style={styles.statCard}>
              <Text style={styles.statNum}>{n}</Text>
              <Kicker style={styles.statLabel}>{l}</Kicker>
            </View>
          ))}
        </View>

        {/* colors */}
        <SectionHead kicker="Bảng màu" title="Màu bạn mặc nhiều nhất" />
        {colors.length === 0 ? (
          <EmptyCard text="Mặc vài outfit để xem bảng màu của bạn" />
        ) : (
          <View style={styles.card}>
            {colors.map((c) => (
              <ColorBar key={c.name} stat={c} max={colors[0].count} />
            ))}
          </View>
        )}

        {/* unworn */}
        <SectionHead kicker="Ngủ quên" title={`${unworn.length} món chưa mặc lần nào`} />
        {unworn.length === 0 ? (
          <EmptyCard text="Tuyệt vời — mọi món đồ đều đã được mặc!" />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.unwornRow}
          >
            {unworn.map((it) => (
              <UnwornCard key={it.id} item={it} onPress={() => router.push(`/item/${it.id}`)} />
            ))}
          </ScrollView>
        )}

        {/* calendar */}
        <SectionHead kicker="Nhật ký" title="Outfit tháng này" />
        <View style={styles.card}>
          <Calendar history={history} onDay={(outfitId) => router.push(`/outfit/${outfitId}`)} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <View style={styles.sectionHead}>
      <Kicker>{kicker}</Kicker>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={[styles.card, styles.emptyCard]}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function ColorBar({ stat, max }: { stat: ColorStat; max: number }) {
  const pct = max > 0 ? Math.max(0.06, stat.count / max) : 0;
  return (
    <View style={styles.colorRow}>
      <View style={styles.colorTop}>
        <View style={styles.colorLabel}>
          <View style={[styles.swatch, { backgroundColor: stat.hex }]} />
          <Text style={styles.colorName}>{stat.name}</Text>
        </View>
        <Text style={styles.colorCount}>{stat.count}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: stat.hex }]} />
      </View>
    </View>
  );
}

function UnwornCard({ item, onPress }: { item: UnwornItem; onPress: () => void }) {
  return (
    <Pressable style={styles.unwornCard} onPress={onPress}>
      <View style={styles.unwornThumb}>
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={styles.unwornImg} resizeMode="cover" />
        ) : (
          <Icon name="closet" size={28} color={T.faint} />
        )}
        <View style={styles.unwornBadge}>
          <Text style={styles.unwornBadgeText}>CHƯA MẶC</Text>
        </View>
      </View>
      <Text style={styles.unwornName} numberOfLines={1}>
        {item.type ? (TYPE_LABEL[item.type] ?? item.type) : 'Món đồ'}
      </Text>
    </Pressable>
  );
}

function Calendar({
  history,
  onDay,
}: {
  history: HistoryEntry[];
  onDay: (outfitId: string) => void;
}) {
  const { cells, byDay } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
    const leading = (firstWeekday + 6) % 7; // Monday-first offset

    const map = new Map<number, HistoryEntry>();
    history.forEach((h) => {
      const d = new Date(`${h.date}T00:00:00`);
      if (d.getFullYear() === year && d.getMonth() === month) map.set(d.getDate(), h);
    });

    const arr: (number | null)[] = [];
    for (let i = 0; i < leading; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return { cells: arr, byDay: map };
  }, [history]);

  const legendOcc = Array.from(
    new Set(history.map((h) => h.occasion).filter(Boolean)),
  ) as string[];

  return (
    <View>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={`e${i}`} style={styles.cell} />;
          const entry = byDay.get(day);
          const tint = entry?.occasion ? OCC_COLOR[entry.occasion] : undefined;
          const filled = !!entry;
          return (
            <Pressable
              key={day}
              style={styles.cell}
              disabled={!filled}
              onPress={() => entry && onDay(entry.outfit_id)}
            >
              <View
                style={[styles.dayBox, filled && { backgroundColor: tint ?? T.accent }]}
              >
                <Text style={[styles.dayText, filled && styles.dayTextFilled]}>{day}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {legendOcc.length > 0 && (
        <View style={styles.legend}>
          {legendOcc.map((occ) => (
            <View key={occ} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: OCC_COLOR[occ] ?? T.accent }]} />
              <Text style={styles.legendText}>{OCCASION_LABEL[occ] ?? occ}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  errText: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 14, color: T.sub },
  retry: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, backgroundColor: T.ink },
  retryText: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 13.5, color: '#FBF8F2' },

  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 4 },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 34,
    color: T.ink,
    letterSpacing: -0.5,
    marginTop: 6,
  },

  stats: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  statCard: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: T.rsm,
    paddingVertical: 16,
    alignItems: 'center',
    ...T.shadow,
  },
  statNum: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 27, color: T.ink },
  statLabel: { marginTop: 2 },

  sectionHead: { paddingHorizontal: 22, paddingTop: 26, paddingBottom: 12 },
  sectionTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 21, color: T.ink, marginTop: 5 },

  card: {
    marginHorizontal: 16,
    backgroundColor: T.surface,
    borderRadius: T.r,
    padding: 18,
    ...T.shadow,
  },
  emptyCard: { alignItems: 'center', paddingVertical: 26 },
  emptyText: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 13.5,
    color: T.sub,
    textAlign: 'center',
  },

  colorRow: { marginBottom: 14 },
  colorTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  colorLabel: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  swatch: { width: 16, height: 16, borderRadius: 5, borderWidth: 1, borderColor: T.line },
  colorName: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 13, color: T.ink },
  colorCount: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 12.5, color: T.sub },
  barTrack: { height: 9, borderRadius: 999, backgroundColor: T.bg2, overflow: 'hidden' },
  barFill: { height: 9, borderRadius: 999 },

  unwornRow: { paddingHorizontal: 16, gap: 12 },
  unwornCard: { width: 130 },
  unwornThumb: {
    height: 130,
    borderRadius: T.rsm,
    backgroundColor: T.ground,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  unwornImg: { width: '100%', height: '100%' },
  unwornBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    backgroundColor: T.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
  },
  unwornBadgeText: {
    fontFamily: 'BeVietnamPro_700Bold',
    fontSize: 9,
    color: T.accent,
    letterSpacing: 0.3,
  },
  unwornName: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 12.5, color: T.ink, marginTop: 8 },

  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 10.5,
    color: T.faint,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  dayBox: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: T.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 11, color: T.faint },
  dayTextFilled: { color: '#FBF8F2' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 11, height: 11, borderRadius: 4 },
  legendText: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 11.5, color: T.sub },
});
