import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const KEY = (userId: string) => `streak:${userId}`;

function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayKey(offsetFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetFromToday);
  return todayStr(d);
}

/** Consecutive days (ending today) present in the viewed-dates set. */
function computeStreak(dates: Set<string>): number {
  if (!dates.has(todayStr())) return 0;
  let streak = 0;
  let offset = 0;
  while (dates.has(dayKey(offset))) {
    streak += 1;
    offset -= 1;
  }
  return streak;
}

/** Monday-first 7-day window: which weekdays this week have a recorded view. */
function computeWeek(dates: Set<string>): boolean[] {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7; // 0 = today is Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(now.getDate() - mondayOffset + i);
    return dates.has(todayStr(d));
  });
}

/**
 * Tracks the consecutive-day streak of viewing outfit suggestions.
 * Dates are stored per-user in AsyncStorage (no backend) — uninstall resets it.
 */
export function useStreak() {
  const [dates, setDates] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active || !user) return;
      setUserId(user.id);
      const raw = await AsyncStorage.getItem(KEY(user.id));
      if (raw) setDates(new Set(JSON.parse(raw) as string[]));
    })();
    return () => {
      active = false;
    };
  }, []);

  const recordView = useCallback(async () => {
    const today = todayStr();
    if (dates.has(today) || !userId) return;
    const next = new Set(dates);
    next.add(today);
    setDates(next);
    await AsyncStorage.setItem(KEY(userId), JSON.stringify([...next]));
  }, [dates, userId]);

  return {
    streak: computeStreak(dates),
    week: computeWeek(dates),
    recordView,
  };
}
