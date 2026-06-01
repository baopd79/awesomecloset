import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useRealtimeItem } from '@/hooks/useRealtimeItem';
import { retryItem, type ProcessingStatus } from '@/lib/api';
import { T } from '@/lib/theme';

export type LocalStatus = 'uploading' | ProcessingStatus;

const STEPS: { key: LocalStatus; label: string; progress: number }[] = [
  { key: 'uploading',   label: 'Đang tải lên',    progress: 0.15 },
  { key: 'pending',     label: 'Chờ xử lý',       progress: 0.25 },
  { key: 'removing_bg', label: 'Đang tách nền',   progress: 0.50 },
  { key: 'tagging',     label: 'AI đang gắn thẻ', progress: 0.80 },
  { key: 'ready',       label: 'Hoàn tất',         progress: 1.00 },
];

interface Props {
  itemId: string | null;
  localUri: string;
  initialStatus: LocalStatus;
  onReady?: () => void;
}

export function ItemProcessingCard({ itemId, localUri, initialStatus, onReady }: Props) {
  const [status, setStatus] = useState<LocalStatus>(initialStatus);
  const [retrying, setRetrying] = useState(false);

  // sync status when upload completes and itemId becomes available
  useEffect(() => {
    if (itemId) setStatus(initialStatus);
  }, [itemId]);

  const handleUpdate = useCallback((s: ProcessingStatus, error: string | null) => {
    void error;
    setStatus(s);
  }, []);

  useRealtimeItem(itemId, handleUpdate);

  useEffect(() => {
    if (status === 'ready') onReady?.();
  }, [status]);

  const handleRetry = async () => {
    if (!itemId || retrying) return;
    setRetrying(true);
    setStatus('pending');
    try {
      await retryItem(itemId);
      // realtime will update status from here
    } catch {
      setStatus('failed');
    } finally {
      setRetrying(false);
    }
  };

  const done = status === 'ready';
  const failed = status === 'failed';
  const uploadFailed = status === 'failed' && !itemId;
  const step = STEPS.find(s => s.key === status) ?? STEPS[0];

  return (
    <View style={styles.card}>
      <View style={styles.thumbWrap}>
        <Image source={{ uri: localUri }} style={styles.thumb} resizeMode="cover" />
        {done && (
          <View style={styles.doneOverlay}>
            <View style={styles.checkCircle}>
              <Icon name="check" size={14} color="#fff" strokeWidth={2.5} />
            </View>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {failed ? (uploadFailed ? 'Tải lên thất bại' : 'Tách nền thất bại') : 'Món đồ mới'}
        </Text>
        <View style={styles.row}>
          {failed ? (
            <Text style={styles.failText}>
              {uploadFailed ? 'Kiểm tra kết nối — thử lại?' : 'Ảnh nền phức tạp — thử lại?'}
            </Text>
          ) : (
            <>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${step.progress * 100}%`, backgroundColor: done ? T.sage : T.accent },
                  ]}
                />
              </View>
              <Text style={[styles.stepLabel, done && styles.stepDone]}>{step.label}</Text>
            </>
          )}
        </View>
      </View>

      {failed && itemId && (
        <Pressable onPress={handleRetry} disabled={retrying} style={styles.retryBtn}>
          <Icon name="retry" size={13} color={T.accent} />
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: T.rsm,
    padding: 12,
    marginBottom: 10,
    gap: 13,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: T.rsm,
    overflow: 'hidden',
    backgroundColor: T.ground,
    flexShrink: 0,
  },
  thumb: { width: 56, height: 56 },
  doneOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(95,126,100,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: T.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 13.5,
    color: T.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
  },
  barBg: {
    flex: 1,
    maxWidth: 120,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.ground,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  stepLabel: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 11.5,
    color: T.sub,
    flexShrink: 0,
  },
  stepDone: { color: T.sage },
  failText: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 12,
    color: T.danger,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: T.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  retryText: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 12.5,
    color: T.accent,
  },
});
