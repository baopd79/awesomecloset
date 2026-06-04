import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getAnalyticsSummary } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export const CLOSET_REQUIRED = 15;

const BADGE_KEY = (userId: string) => `firstClosetBadge:${userId}`;

/**
 * Fetches the ready-item count (active + ready, from /api/analytics/summary) and
 * detects the first time it reaches 15 to award the "Tủ đồ đầu tiên" badge.
 *
 * Refetches whenever the Home screen regains focus so the progress bar updates
 * right after the user uploads more items. The badge flag is stored per-user in
 * AsyncStorage so it fires only once.
 */
export function useClosetMilestone() {
  const [readyCount, setReadyCount] = useState<number | null>(null);
  const [showBadge, setShowBadge] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const { items_count } = await getAnalyticsSummary();
      setReadyCount(items_count);

      if (items_count >= CLOSET_REQUIRED) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const awarded = await AsyncStorage.getItem(BADGE_KEY(user.id));
        if (!awarded) setShowBadge(true);
      }
    } catch {
      // Keep last known count on transient errors.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const dismissBadge = useCallback(async () => {
    setShowBadge(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await AsyncStorage.setItem(BADGE_KEY(user.id), 'true');
  }, []);

  return { readyCount, showBadge, dismissBadge, refetch };
}
