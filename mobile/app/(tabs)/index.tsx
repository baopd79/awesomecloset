// Hôm nay screen — placeholder, content implemented in Task 15
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Kicker } from '@/components/ui/Kicker';
import { T } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.content}>
        <Kicker>Hôm nay</Kicker>
        <Text style={styles.title}>Gợi ý outfit</Text>
        <Text style={styles.sub}>Nội dung sẽ có ở Task 15</Text>
      </View>
      <Pressable style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: T.ink,
    marginTop: 8,
    textAlign: 'center',
  },
  sub: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 14, color: T.sub, marginTop: 8, textAlign: 'center' },
  logoutBtn: { margin: 24, padding: 14, alignItems: 'center' },
  logoutText: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 14, color: T.sub },
});
