import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Icon, IconName } from './Icon';
import { T } from '@/lib/theme';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  icon?: IconName;
  style?: ViewStyle;
  disabled?: boolean;
}

export function PrimaryBtn({ children, onPress, icon, style, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, style, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {icon && <Icon name={icon} size={18} color="#FBF8F2" />}
      <Text style={styles.label}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 50,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: T.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1E1B16',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.5 },
  label: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 16.5,
    color: '#FBF8F2',
    letterSpacing: 0.2,
  },
});
