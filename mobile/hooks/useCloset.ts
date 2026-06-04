import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { archiveItem, listItems, type ItemResponse } from '@/lib/api';
import { type ClosetCategory, CATEGORY_TYPES } from '@/lib/labels';

interface ClosetState {
  items: ItemResponse[];
  loading: boolean;
  error: string | null;
}

export function useCloset() {
  const [state, setState] = useState<ClosetState>({ items: [], loading: true, error: null });
  const [category, setCategory] = useState<ClosetCategory>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await listItems({ limit: 100, is_archived: false });
      setState({ items: res.items, loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: String(e) }));
    }
  }, []);

  // Refetch whenever the Closet regains focus so a restore from Archive (or a new
  // upload) shows up. First focus shows the spinner; later focuses refresh silently.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      void load(!firstFocus.current);
      firstFocus.current = false;
    }, [load]),
  );

  const archive = useCallback(async (id: string) => {
    // Optimistic: remove immediately
    setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
    try {
      await archiveItem(id);
    } catch {
      // Reload on failure to restore state
      void load();
    }
  }, [load]);

  const filteredItems = state.items.filter((item) => {
    const types = CATEGORY_TYPES[category];
    if (types && (!item.type || !types.includes(item.type))) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      const searchable = [
        item.type ?? '',
        ...(item.custom_tags ?? []),
        ...(item.occasion ?? []),
        ...(item.style ?? []),
      ].join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  return {
    items: filteredItems,
    allItems: state.items,
    loading: state.loading,
    error: state.error,
    category,
    setCategory,
    query,
    setQuery,
    archive,
    refresh: load,
  };
}
