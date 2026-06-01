import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { T } from '@/lib/theme';

interface Props {
  children: React.ReactNode;
  color?: string;
  style?: TextStyle;
}

export function Kicker({ children, color, style }: Props) {
  return (
    <Text style={[styles.kicker, { color: color ?? T.faint }, style]}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Text>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 11,
    letterSpacing: 2,
  },
});
