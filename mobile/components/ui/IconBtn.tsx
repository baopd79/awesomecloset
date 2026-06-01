import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Icon, IconName } from './Icon';
import { T } from '@/lib/theme';

interface Props {
  name: IconName;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  style?: ViewStyle;
}

export function IconBtn({ name, onPress, size = 42, iconSize = 20, color, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { width: size, height: size, borderRadius: size / 2 },
        style,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={name} size={iconSize} color={color ?? T.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...T.shadow,
  },
  pressed: { transform: [{ scale: 0.93 }] },
});
