import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { type ClosetCategory, CATEGORY_LABEL } from '@/lib/labels';
import { T } from '@/lib/theme';

const CATEGORIES: ClosetCategory[] = ['all', 'tops', 'bottoms', 'shoes', 'accessories'];

interface Props {
  active: ClosetCategory;
  onChange: (cat: ClosetCategory) => void;
}

export function FilterBar({ active, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CATEGORIES.map((cat) => {
        const isActive = cat === active;
        return (
          <Pressable
            key={cat}
            onPress={() => onChange(cat)}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {CATEGORY_LABEL[cat]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
  },
  pillActive: {
    backgroundColor: T.ink,
    borderColor: T.ink,
  },
  label: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 13,
    color: T.ink2,
  },
  labelActive: {
    color: '#fff',
  },
});
