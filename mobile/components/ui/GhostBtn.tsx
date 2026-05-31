import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Icon, IconName } from './Icon';
import { T } from '@/lib/theme';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  icon?: IconName;
  active?: boolean;
  style?: ViewStyle;
}

export function GhostBtn({ children, onPress, icon, active, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        active && styles.active,
        style,
        pressed && styles.pressed,
      ]}
    >
      {icon && <Icon name={icon} size={18} color={active ? T.accent : T.ink} />}
      <Text style={[styles.label, active && styles.labelActive]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: T.line,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  active: {
    borderColor: T.accent,
    backgroundColor: T.accentSoft,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  label: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 14.5,
    color: T.ink,
  },
  labelActive: {
    color: T.accent,
  },
});
