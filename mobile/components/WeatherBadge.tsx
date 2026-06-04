import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { type WeatherResponse } from '@/lib/api';
import { T } from '@/lib/theme';

interface Props {
  weather: WeatherResponse;
}

export function WeatherBadge({ weather }: Props) {
  const cond = weather.condition.split(',')[0];
  return (
    <View style={styles.row}>
      <Text style={styles.temp}>{Math.round(weather.temp_c)}°</Text>
      <View style={styles.meta}>
        <View style={styles.condRow}>
          <Icon name="sun" size={18} color={T.star} />
          <Text style={styles.cond}>{cond}</Text>
        </View>
        <View style={styles.cityRow}>
          <Icon name="loc" size={13} color={T.sub} />
          <Text style={styles.city}>{weather.city}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, paddingHorizontal: 22, paddingBottom: 20, paddingTop: 4 },
  temp: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 56, lineHeight: 56, letterSpacing: -1.5, color: T.ink },
  meta: { paddingBottom: 5, flex: 1, gap: 3 },
  condRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cond: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 14, color: T.ink },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  city: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 12.5, color: T.sub },
});
