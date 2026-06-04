import { useCallback, useEffect, useState } from 'react';
import {
  getAnalyticsSummary,
  getColorStats,
  getHistory,
  getUnworn,
  type AnalyticsSummary,
  type ColorStat,
  type HistoryEntry,
  type UnwornItem,
} from '@/lib/api';

interface AnalyticsData {
  summary: AnalyticsSummary | null;
  colors: ColorStat[];
  unworn: UnwornItem[];
  history: HistoryEntry[];
}

const EMPTY: AnalyticsData = { summary: null, colors: [], unworn: [], history: [] };

/** Fetches all analytics endpoints in parallel (client only receives aggregated data). */
export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summary, colors, unworn, history] = await Promise.all([
        getAnalyticsSummary(),
        getColorStats(),
        getUnworn(),
        getHistory(),
      ]);
      setData({ summary, colors: colors.colors, unworn: unworn.items, history: history.days });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, loading, error, refetch: load };
}
