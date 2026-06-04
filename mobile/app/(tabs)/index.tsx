import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { OccasionSelector } from '@/components/OccasionSelector';
import { OutfitCard } from '@/components/OutfitCard';
import { SuggestionGateProgress } from '@/components/SuggestionGateProgress';
import { WearRatingSheet } from '@/components/WearRatingSheet';
import { WeatherBadge } from '@/components/WeatherBadge';
import { Icon } from '@/components/ui/Icon';
import { Kicker } from '@/components/ui/Kicker';
import { PrimaryBtn } from '@/components/ui/PrimaryBtn';
import { submitFeedback, wearOutfit } from '@/lib/api';
import { useSuggest } from '@/hooks/useSuggest';
import { T } from '@/lib/theme';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function todayLabel(): string {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]} · ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const s = useSuggest();

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [wearTarget, setWearTarget] = useState<string | null>(null);
  const [wearSubmitting, setWearSubmitting] = useState(false);

  const visibleOutfits = s.outfits.filter((o) => !dismissedIds.has(o.id));

  async function handleSave(id: string) {
    setSavedIds((prev) => new Set(prev).add(id));
    await submitFeedback(id, 'saved').catch(() => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

  async function handleDislike(id: string) {
    setDismissedIds((prev) => new Set(prev).add(id));
    await submitFeedback(id, 'disliked').catch(() => {});
  }

  async function handleConfirmWear(rating: number | undefined) {
    if (!wearTarget) return;
    setWearSubmitting(true);
    try {
      await wearOutfit(wearTarget, rating);
      setWearTarget(null);
    } finally {
      setWearSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Kicker>{todayLabel()}</Kicker>
            <Text style={styles.greeting}>{greeting()}</Text>
          </View>
        </View>

        {/* weather */}
        {s.weather && <WeatherBadge weather={s.weather} />}

        {/* context picker */}
        <OccasionSelector
          occasion={s.occasion}
          onOccasion={s.setOccasion}
          manualCondition={s.manualCondition}
          onManualCondition={s.setManualCondition}
        />

        {s.needsManualWeather && (
          <Text style={styles.notice}>
            Không lấy được vị trí. Hãy chọn thời tiết thủ công ở trên rồi thử lại.
          </Text>
        )}

        <View style={styles.generateWrap}>
          <PrimaryBtn
            icon="spark"
            onPress={s.generate}
            disabled={s.phase === 'generating'}
            style={styles.generateBtn}
          >
            {s.phase === 'generating' ? 'AI đang phối đồ…' : 'Tạo gợi ý'}
          </PrimaryBtn>
        </View>

        {/* generating */}
        {s.phase === 'generating' && (
          <View style={styles.centerBlock}>
            <ActivityIndicator color={T.accent} />
            <Text style={styles.generatingText}>Đọc thời tiết, quét tủ đồ & phối theo dịp…</Text>
          </View>
        )}

        {/* gate */}
        {s.phase === 'gate' && s.gate && (
          <SuggestionGateProgress
            count={s.gate.count}
            required={s.gate.required}
            onAdd={() => router.navigate('/add')}
          />
        )}

        {/* error */}
        {s.phase === 'error' && (
          <View style={styles.centerBlock}>
            <Text style={styles.errorText}>Không tạo được gợi ý. Vui lòng thử lại.</Text>
          </View>
        )}

        {/* results */}
        {s.phase === 'results' && (
          <View style={styles.results}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {visibleOutfits.length} gợi ý cho hôm nay
              </Text>
              <Text style={styles.refresh} onPress={s.generate}>
                Làm mới
              </Text>
            </View>
            {visibleOutfits.map((o) => (
              <OutfitCard
                key={o.id}
                outfit={o}
                saved={savedIds.has(o.id)}
                onPress={() => router.push(`/outfit/${o.id}`)}
                onWear={() => setWearTarget(o.id)}
                onSave={() => handleSave(o.id)}
                onDislike={() => handleDislike(o.id)}
              />
            ))}
            {visibleOutfits.length === 0 && (
              <View style={styles.centerBlock}>
                <Icon name="spark" size={26} color={T.accent} />
                <Text style={styles.generatingText}>Đã ẩn hết gợi ý. Bấm "Tạo gợi ý" để thử lại.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <WearRatingSheet
        visible={wearTarget !== null}
        submitting={wearSubmitting}
        onClose={() => setWearTarget(null)}
        onConfirm={handleConfirmWear}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 110 },
  greetingRow: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 2 },
  greeting: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 33, lineHeight: 36, color: T.ink, marginTop: 8, letterSpacing: -0.4 },
  notice: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 13, color: T.danger, paddingHorizontal: 22, marginTop: 14 },
  generateWrap: { paddingHorizontal: 22, marginTop: 24 },
  generateBtn: { width: '100%' },
  centerBlock: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32, paddingVertical: 40 },
  generatingText: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 13.5, color: T.sub, textAlign: 'center' },
  errorText: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 14, color: T.danger, textAlign: 'center' },
  results: { paddingHorizontal: 16, marginTop: 28, gap: 16 },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 6 },
  resultsTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 21, color: T.ink },
  refresh: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 13, color: T.accent },
});
