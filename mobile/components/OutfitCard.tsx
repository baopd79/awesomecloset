import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { type OutfitResponse } from '@/lib/api';
import { OCCASION_LABEL } from '@/lib/labels';
import { T } from '@/lib/theme';

interface Props {
  outfit: OutfitResponse;
  onPress: () => void;
  onWear: () => void;
  onSave: () => void;
  onDislike: () => void;
  saved: boolean;
}

/** Suggested-outfit card: server collage (fallback to item thumbnails) + reasoning + actions. */
export function OutfitCard({ outfit, onPress, onWear, onSave, onDislike, saved }: Props) {
  const occ = outfit.occasion ? OCCASION_LABEL[outfit.occasion] ?? outfit.occasion : 'Gợi ý';

  return (
    <View style={styles.card}>
      <Pressable onPress={onPress}>
        <OutfitCollage outfit={outfit} />
      </Pressable>

      <View style={styles.body}>
        <View style={styles.chip}>
          <Icon name="spark" size={12} color={T.sage} />
          <Text style={styles.chipText}>{occ}</Text>
        </View>

        {outfit.name && <Text style={styles.name}>{outfit.name}</Text>}
        {outfit.ai_reasoning && (
          <Text style={styles.reason} numberOfLines={3}>
            {outfit.ai_reasoning}
          </Text>
        )}

        <View style={styles.actions}>
          <Pressable style={styles.wearBtn} onPress={onWear}>
            <Icon name="wear" size={18} color="#FBF8F2" />
            <Text style={styles.wearText}>Mặc hôm nay</Text>
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={onSave}>
            <Icon name="heart" size={20} color={saved ? T.accent : T.ink} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={onDislike}>
            <Icon name="dislike" size={20} color={T.ink} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function OutfitCollage({ outfit }: { outfit: OutfitResponse }) {
  if (outfit.collage_url) {
    return <Image source={{ uri: outfit.collage_url }} style={styles.collage} resizeMode="cover" />;
  }
  // Graceful fallback: tile up to 4 item thumbnails when the collage failed to generate.
  const tiles = outfit.items
    .map((i) => i.thumbnail_url ?? i.processed_url)
    .filter((u): u is string => !!u)
    .slice(0, 4);
  return (
    <View style={[styles.collage, styles.fallback]}>
      {tiles.map((uri, i) => (
        <Image key={i} source={{ uri }} style={styles.tile} resizeMode="contain" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: T.surface, borderRadius: T.r, overflow: 'hidden', ...T.shadowLg },
  collage: { width: '100%', height: 210, backgroundColor: T.ground },
  fallback: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', padding: 8, gap: 4 },
  tile: { width: '46%', height: 96 },
  body: { padding: 18 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: T.sageSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: { fontFamily: 'BeVietnamPro_700Bold', fontSize: 11, color: T.sage },
  name: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: T.ink, marginTop: 10, letterSpacing: -0.2 },
  reason: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 13.5, lineHeight: 21, color: T.sub, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'center' },
  wearBtn: {
    flex: 1,
    height: 50,
    borderRadius: 999,
    backgroundColor: T.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  wearText: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 16, color: '#FBF8F2', letterSpacing: 0.2 },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: T.line,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
