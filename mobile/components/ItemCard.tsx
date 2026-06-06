import React, { useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/ui/Icon';
import { type ItemResponse } from '@/lib/api';
import { OCCASION_LABEL, TYPE_LABEL } from '@/lib/labels';
import { T } from '@/lib/theme';

// Vary image height per card for masonry feel (deterministic by id)
const HEIGHTS = [150, 184, 162, 198, 156, 176, 192, 152, 170];
function imgHeight(id: string): number {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return HEIGHTS[hash % HEIGHTS.length];
}

// Items added within this window get a "MỚI" badge so the freshly-uploaded ones stand out.
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;
function isRecentlyAdded(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < NEW_WINDOW_MS;
}

interface Props {
  item: ItemResponse;
  onArchive: (id: string) => void;
}

function ArchiveAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.archiveAction}>
      <Icon name="archive" size={20} color="#fff" />
      <Text style={styles.archiveLabel}>Lưu trữ</Text>
    </Pressable>
  );
}

export function ItemCard({ item, onArchive }: Props) {
  const router = useRouter();
  const swipeRef = useRef<Swipeable>(null);
  const isReady = item.processing_status === 'ready';
  const isFailed = item.processing_status === 'failed';
  const isNew = isReady && isRecentlyAdded(item.created_at);
  const h = imgHeight(item.id);

  function handleArchive() {
    swipeRef.current?.close();
    onArchive(item.id);
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => <ArchiveAction onPress={handleArchive} />}
      overshootRight={false}
    >
      <Pressable
        onPress={() => router.push(`/item/${item.id}`)}
        style={styles.card}
      >
        {/* image area */}
        <View style={[styles.imgWrap, { height: h }]}>
          {isReady && item.processed_url ? (
            <Image
              source={{ uri: item.processed_url }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
          ) : isFailed ? (
            <View style={styles.errorState}>
              <Icon name="close" size={22} color={T.danger} strokeWidth={2} />
            </View>
          ) : (
            <SkeletonShimmer />
          )}

          {isNew ? (
            <View style={[styles.badge, styles.badgeNew]}>
              <Text style={[styles.badgeText, styles.badgeNewText]}>MỚI</Text>
            </View>
          ) : (
            isReady && item.wear_count === 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>CHƯA MẶC</Text>
              </View>
            )
          )}
        </View>

        {/* info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {isFailed
              ? 'Xử lý thất bại'
              : isReady
              ? (TYPE_LABEL[item.type ?? ''] ?? 'Món đồ')
              : 'Đang xử lý…'}
          </Text>
          {isReady && item.occasion && item.occasion.length > 0 && (
            <Text style={styles.sub} numberOfLines={1}>
              {OCCASION_LABEL[item.occasion[0]] ?? item.occasion[0]}
            </Text>
          )}
          {isFailed && (
            <Text style={styles.errorText}>Thử lại</Text>
          )}
        </View>
      </Pressable>
    </Swipeable>
  );
}

function SkeletonShimmer() {
  const anim = useRef(new Animated.Value(0.4)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.skeleton, { opacity: anim }]} />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.rsm,
    overflow: 'hidden',
    marginBottom: 10,
    ...T.shadow,
  },
  imgWrap: {
    backgroundColor: T.ground,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: T.accentSoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: 'BeVietnamPro_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
    color: T.accent,
  },
  badgeNew: {
    backgroundColor: T.accent,
  },
  badgeNewText: {
    color: '#fff',
  },
  info: {
    padding: 11,
    paddingTop: 10,
  },
  name: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 15,
    color: T.ink,
    lineHeight: 20,
  },
  sub: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 11,
    color: T.sub,
    marginTop: 4,
  },
  errorText: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 11,
    color: T.danger,
    marginTop: 4,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeleton: {
    backgroundColor: T.ground,
  },
  archiveAction: {
    backgroundColor: T.accent,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: T.rsm,
    marginBottom: 10,
    gap: 4,
  },
  archiveLabel: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 11,
    color: '#fff',
  },
});
