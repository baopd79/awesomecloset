// 3-step first-run walkthrough (Task 17). Shown once after registration; on
// completion sets AsyncStorage 'hasOnboarded' = 'true' and the root layout
// redirects to (tabs). Uninstall clears the flag → onboarding shows again.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Garment, type GarmentKind } from '@/components/ui/Garment';
import { Kicker } from '@/components/ui/Kicker';
import { PrimaryBtn } from '@/components/ui/PrimaryBtn';
import { supabase } from '@/lib/supabase';
import { T } from '@/lib/theme';
import { onboardingKey, useOnboarding } from '../_layout';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 22,
    paddingTop: 8,
    height: 36,
  },
  skip: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 14, color: T.sub },

  heroArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },

  // slide 1
  slide1Row: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  pieceCard: {
    width: 92,
    height: 116,
    backgroundColor: T.surface,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...T.shadowLg,
  },

  // slide 2
  slide2Wrap: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  slide2Card: {
    width: 150,
    height: 150,
    backgroundColor: T.surface,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...T.shadowLg,
  },
  tag: {
    position: 'absolute',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    ...T.shadow,
  },
  tagAccent: { backgroundColor: T.accentSoft },
  tagSage: { backgroundColor: T.sageSoft },
  tagAccentText: { fontFamily: 'BeVietnamPro_700Bold', fontSize: 11, color: T.accent },
  tagSageText: { fontFamily: 'BeVietnamPro_700Bold', fontSize: 11, color: T.sage },

  // slide 3
  outfitCard: {
    width: 200,
    backgroundColor: T.surface,
    borderRadius: 22,
    overflow: 'hidden',
    ...T.shadowLg,
  },
  collage: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: T.ground, padding: 12, gap: 8 },
  collageCell: {
    width: 80,
    height: 64,
    backgroundColor: T.surface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitMeta: { padding: 14 },
  occPill: {
    alignSelf: 'flex-start',
    backgroundColor: T.sageSoft,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  occPillText: { fontFamily: 'BeVietnamPro_700Bold', fontSize: 10, color: T.sage },
  outfitName: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 16, color: T.ink, marginTop: 8 },

  // bottom text block
  bottom: { paddingHorizontal: 30, paddingBottom: 24 },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 38,
    lineHeight: 40,
    color: T.ink,
    marginTop: 12,
    letterSpacing: -0.5,
  },
  titleItalic: { fontFamily: 'PlayfairDisplay_700Bold_Italic' },
  body: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: T.sub,
    marginTop: 14,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 32,
  },
  dots: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  dot: { height: 8, borderRadius: 999 },
  dotActive: { width: 24, backgroundColor: T.accent },
  dotIdle: { width: 8, backgroundColor: T.line },
});

interface Slide {
  kicker: string;
  title: [string, string];
  body: string;
  accent: 'accent' | 'sage';
  hero: React.ReactNode;
}

const SLIDE1_PIECES: {
  kind: GarmentKind;
  color: string;
  accent?: string;
  rot: number;
  dy: number;
}[] = [
  { kind: 'tee', color: '#e7e3da', rot: -6, dy: 6 },
  { kind: 'jeans', color: '#5b6b85', rot: 0, dy: -10 },
  { kind: 'sneakers', color: '#ece8e1', accent: '#d8d2c6', rot: 6, dy: 6 },
];

const SLIDE2_TAGS = ['Sơ mi', 'Xanh nhạt', 'Công sở', 'Đi làm'];

const SLIDE3_PIECES: { kind: GarmentKind; color: string; accent?: string }[] = [
  { kind: 'shirt', color: '#7d97b5' },
  { kind: 'pants', color: '#3a3a3c' },
  { kind: 'sneakers', color: '#ece8e1', accent: '#d8d2c6' },
  { kind: 'bag', color: '#8a6f57', accent: '#6f5946' },
];

const SLIDES: Slide[] = [
  {
    kicker: 'Bước 01',
    title: ['Chụp', 'tủ đồ của bạn'],
    body: 'Chụp từng món hoặc chọn nhiều ảnh từ thư viện. App tự tách nền, giữ lại món đồ trên nền sạch.',
    accent: 'accent',
    hero: (
      <View style={styles.slide1Row}>
        {SLIDE1_PIECES.map((p) => (
          <View
            key={p.kind}
            style={[
              styles.pieceCard,
              { transform: [{ rotate: `${p.rot}deg` }, { translateY: p.dy }] },
            ]}
          >
            <Garment kind={p.kind} color={p.color} accent={p.accent} size={62} />
          </View>
        ))}
      </View>
    ),
  },
  {
    kicker: 'Bước 02',
    title: ['AI', 'tự gắn thẻ'],
    body: 'Mỗi món được nhận diện loại, màu, phong cách, mùa và dịp mặc — bạn chỉ việc duyệt lại nếu muốn.',
    accent: 'sage',
    hero: (
      <View style={styles.slide2Wrap}>
        <View style={styles.slide2Card}>
          <Garment kind="shirt" color="#7d97b5" size={100} />
        </View>
        <View style={[styles.tag, styles.tagAccent, { top: 8, left: -14 }]}>
          <Text style={styles.tagAccentText}>{SLIDE2_TAGS[0]}</Text>
        </View>
        <View style={[styles.tag, styles.tagSage, { top: 30, right: -22 }]}>
          <Text style={styles.tagSageText}>{SLIDE2_TAGS[1]}</Text>
        </View>
        <View style={[styles.tag, styles.tagAccent, { bottom: 24, left: -18 }]}>
          <Text style={styles.tagAccentText}>{SLIDE2_TAGS[2]}</Text>
        </View>
        <View style={[styles.tag, styles.tagSage, { bottom: 4, right: -10 }]}>
          <Text style={styles.tagSageText}>{SLIDE2_TAGS[3]}</Text>
        </View>
      </View>
    ),
  },
  {
    kicker: 'Bước 03',
    title: ['Mặc đẹp', 'mỗi sáng'],
    body: 'Mỗi sáng AI gợi ý outfit hợp thời tiết và lịch của bạn. Đủ 15 món là mở khóa ngay.',
    accent: 'accent',
    hero: (
      <View style={styles.outfitCard}>
        <View style={styles.collage}>
          {SLIDE3_PIECES.map((p, i) => (
            <View key={i} style={styles.collageCell}>
              <Garment kind={p.kind} color={p.color} accent={p.accent} size={46} />
            </View>
          ))}
        </View>
        <View style={styles.outfitMeta}>
          <View style={styles.occPill}>
            <Text style={styles.occPillText}>Đi làm</Text>
          </View>
          <Text style={styles.outfitName}>Đi làm nhẹ nhàng</Text>
        </View>
      </View>
    ),
  },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useOnboarding();
  const [step, setStep] = useState(0);

  const slide = SLIDES[step];
  const last = step === SLIDES.length - 1;
  const accentColor = slide.accent === 'sage' ? T.sage : T.accent;

  async function done() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await AsyncStorage.setItem(onboardingKey(user.id), 'true');
    completeOnboarding();
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.skipRow}>
        {!last && (
          <Pressable onPress={done} hitSlop={8}>
            <Text style={styles.skip}>Bỏ qua</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.heroArea}>{slide.hero}</View>

      <View style={styles.bottom}>
        <Kicker color={accentColor}>{slide.kicker}</Kicker>
        <Text style={styles.title}>
          {slide.title[0]} <Text style={styles.titleItalic}>{slide.title[1]}</Text>
        </Text>
        <Text style={styles.body}>{slide.body}</Text>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === step ? styles.dotActive : styles.dotIdle]} />
            ))}
          </View>
          <PrimaryBtn
            icon={last ? 'check' : undefined}
            onPress={() => (last ? done() : setStep(step + 1))}
          >
            {last ? 'Bắt đầu' : 'Tiếp tục'}
          </PrimaryBtn>
        </View>
      </View>
    </SafeAreaView>
  );
}
