import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { ProcessingStatus } from '@/lib/api';

export function useRealtimeItem(
  itemId: string | null,
  onUpdate: (status: ProcessingStatus, error: string | null) => void,
) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; });

  useEffect(() => {
    if (!itemId) return;

    const channel = supabase
      .channel(`item-status:${itemId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'items', filter: `id=eq.${itemId}` },
        (payload) => {
          const rec = payload.new as { processing_status: ProcessingStatus; processing_error: string | null };
          onUpdateRef.current(rec.processing_status, rec.processing_error ?? null);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [itemId]);
}
