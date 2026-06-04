import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconBtn } from '@/components/ui/IconBtn';
import { Kicker } from '@/components/ui/Kicker';
import { getAnalyticsSummary } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { T } from '@/lib/theme';
import { useSession } from '@/hooks/useSession';
import { useStreak } from '@/hooks/useStreak';

const VN_MONTH = (m: number) => `T${m + 1}`;

function memberSince(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `Thành viên từ ${VN_MONTH(d.getMonth())} ${d.getFullYear()}`;
}

interface RowProps {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}

function SettingRow({ icon, label, value, onPress, danger, last }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, !last && styles.rowBorder]}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Icon name={icon} size={18} color={danger ? T.danger : T.ink2} />
      </View>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {onPress && !danger && <Icon name="chevron" size={16} color={T.faint} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { streak } = useStreak();
  const [stats, setStats] = useState<{ items: number; outfits: number } | null>(null);

  useEffect(() => {
    getAnalyticsSummary()
      .then((s) => setStats({ items: s.items_count, outfits: s.outfits_count }))
      .catch(() => setStats({ items: 0, outfits: 0 }));
  }, []);

  const email = session?.user.email ?? '';
  const initial = (email[0] ?? '?').toUpperCase();
  const name = email.split('@')[0] || 'Bạn';

  function confirmLogout() {
    Alert.alert('Đăng xuất', 'Bạn chắc chắn muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          void supabase.auth.signOut();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <IconBtn name="back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Hồ sơ</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* identity */}
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>{memberSince(session?.user.created_at)}</Text>
        </View>

        {/* stats */}
        <View style={styles.stats}>
          {[
            [stats?.items ?? 0, 'món'],
            [stats?.outfits ?? 0, 'outfit'],
            [streak, 'streak'],
          ].map(([n, l]) => (
            <View key={l} style={styles.statCard}>
              <Text style={styles.statNum}>{n}</Text>
              <Kicker style={styles.statLabel}>{l}</Kicker>
            </View>
          ))}
        </View>

        {/* collection */}
        <Kicker style={styles.sectionKicker}>Bộ sưu tập</Kicker>
        <View style={styles.card}>
          <SettingRow icon="heart" label="Outfit đã lưu" value="Sắp ra mắt" />
          <SettingRow
            icon="archive"
            label="Đồ đã lưu trữ"
            onPress={() => router.push('/archive')}
            last
          />
        </View>

        {/* logout */}
        <View style={[styles.card, styles.logoutCard]}>
          <SettingRow icon="logout" label="Đăng xuất" danger onPress={confirmLogout} last />
        </View>

        <Text style={styles.version}>AwesomeCloset · phiên bản 1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headerTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 19, color: T.ink },
  scroll: { paddingBottom: 40 },

  identity: { alignItems: 'center', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...T.shadowLg,
  },
  avatarText: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 36, color: '#FBF8F2' },
  name: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: T.ink, marginTop: 14 },
  meta: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 13, color: T.sub, marginTop: 3 },

  stats: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 18 },
  statCard: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: T.rsm,
    paddingVertical: 14,
    alignItems: 'center',
    ...T.shadow,
  },
  statNum: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: T.ink },
  statLabel: { marginTop: 2 },

  sectionKicker: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 10 },
  card: { marginHorizontal: 16, backgroundColor: T.surface, borderRadius: T.r, ...T.shadow },
  logoutCard: { marginTop: 20 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: T.line },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: T.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: '#F2E0DB' },
  rowLabel: { flex: 1, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 14.5, color: T.ink },
  rowLabelDanger: { color: T.danger },
  rowValue: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 13.5, color: T.sub },

  version: {
    textAlign: 'center',
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 11.5,
    color: T.faint,
    paddingTop: 22,
  },
});
