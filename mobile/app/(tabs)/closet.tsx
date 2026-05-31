// Tủ đồ screen — placeholder, content implemented in Task 10
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Kicker } from '@/components/ui/Kicker';
import { T } from '@/lib/theme';

export default function ClosetScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.content}>
        <Kicker>Tủ đồ</Kicker>
        <Text style={styles.title}>Quần áo của bạn</Text>
        <Text style={styles.sub}>Nội dung sẽ có ở Task 10</Text>
      </View>
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
});
