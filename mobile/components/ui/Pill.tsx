import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { T } from '@/lib/theme';

interface Props {
  children: string;
  selected: boolean;
  onPress: () => void;
}

/** A selectable chip used in tag-edit pickers. Selected = accent-soft fill + accent text. */
export function Pill({ children, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, selected && styles.pillSelected]}
      hitSlop={4}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: T.line,
    backgroundColor: T.surface,
  },
  pillSelected: {
    borderColor: T.accent,
    backgroundColor: T.accentSoft,
  },
  text: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 13,
    color: T.ink2,
  },
  textSelected: {
    color: T.accent,
  },
});
