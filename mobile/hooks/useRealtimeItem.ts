import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { ProcessingStatus, TagStatus } from '@/lib/api';

export interface RealtimeItemUpdate {
  processing_status: ProcessingStatus;
  tag_status: TagStatus;
  processing_error: string | null;
}

export function useRealtimeItem(
  itemId: string | null,
  onUpdate: (rec: RealtimeItemUpdate) => void,
) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; });

  useEffect(() => {
    if (!itemId) return;

    const channel = supabase
      .channel(`item-status:${itemId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clothing_items', filter: `id=eq.${itemId}` },
        (payload) => {
          const rec = payload.new as RealtimeItemUpdate;
          onUpdateRef.current({
            processing_status: rec.processing_status,
            tag_status: rec.tag_status,
            processing_error: rec.processing_error ?? null,
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [itemId]);
}
