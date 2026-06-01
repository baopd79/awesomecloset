import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PrimaryBtn } from '@/components/ui/PrimaryBtn';
import { T } from '@/lib/theme';

// Welcome screen — matches design_handoff_awesomecloset/app-auth.jsx (welcome mode)
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      {/* Hero */}
      <View style={styles.hero}>
        {/* Brand row */}
        <View style={styles.brandRow}>
          <View style={styles.logoBox}>
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Path
                d="M12 4a2 2 0 00-1 3.7c.6.3 1 .8 1 1.5L3.5 14c-1 .6-1.5 1.3-1.5 2 0 1 .9 1.5 2 1.5h16c1.1 0 2-.5 2-1.5 0-.7-.5-1.4-1.5-2L13 9.2"
                fill="none"
                stroke="#FBF8F2"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text style={styles.wordmark}>AwesomeCloset</Text>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          {'Tủ đồ của bạn,\n'}
          <Text style={styles.headlineItalic}>thông minh</Text>
          {' hơn.'}
        </Text>

        <Text style={styles.sub}>
          Số hóa tủ quần áo, để AI gợi ý outfit hợp thời tiết mỗi sáng. Không còn loay hoay "hôm nay mặc gì".
        </Text>
      </View>

      {/* Preview strip — 4 placeholder cards staggered */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.previewStrip}
        scrollEnabled={false}
      >
        {PREVIEW_CARDS.map(({ color }, i) => (
          <View
            key={i}
            style={[
              styles.previewCard,
              { backgroundColor: color, transform: [{ translateY: i % 2 === 1 ? 8 : 0 }] },
            ]}
          />
        ))}
      </ScrollView>

      {/* CTAs */}
      <View style={styles.actions}>
        <PrimaryBtn style={styles.btnFull} onPress={() => router.push('/(auth)/register')}>
          Tạo tài khoản
        </PrimaryBtn>
        <Pressable onPress={() => router.push('/(auth)/login')} style={styles.loginLink}>
          <Text style={styles.loginText}>
            Đã có tài khoản?{' '}
            <Text style={{ color: T.accent, fontFamily: 'BeVietnamPro_700Bold' }}>Đăng nhập</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const PREVIEW_CARDS = [
  { color: '#e7e3da' },
  { color: '#7d97b5' },
  { color: '#c98b86' },
  { color: '#ece8e1' },
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  hero: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30 },
  logoBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: T.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 21,
    color: T.ink,
    letterSpacing: -0.2,
  },
  headline: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 44,
    lineHeight: 48,
    color: T.ink,
    letterSpacing: -0.8,
  },
  headlineItalic: {
    fontFamily: 'PlayfairDisplay_700Bold_Italic',
  },
  sub: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 15.5,
    lineHeight: 25,
    color: T.sub,
    marginTop: 18,
    maxWidth: 300,
  },
  previewStrip: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 32,
    paddingBottom: 30,
  },
  previewCard: {
    width: 80,
    aspectRatio: 3 / 4,
    borderRadius: T.rsm,
    ...T.shadow,
  },
  actions: { paddingHorizontal: 28, paddingBottom: 40 },
  btnFull: { width: '100%' },
  loginLink: { height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  loginText: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 14.5,
    color: T.ink,
  },
});
