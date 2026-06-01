import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon, IconName } from './Icon';
import { T } from '@/lib/theme';

interface Props {
  icon: IconName;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  trailing?: React.ReactNode;
}

export function Field({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  trailing,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.row, focused && styles.rowFocused]}>
        <Icon name={icon} size={18} color={focused ? T.accent : T.sub} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.faint}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {trailing}
      </View>
    </View>
  );
}

export function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} hitSlop={8}>
      <Icon name={show ? 'eyeOff' : 'eye'} size={18} color={T.sub} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 12,
    color: T.sub,
    marginBottom: 7,
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: T.surface,
    borderRadius: T.rsm,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...T.shadow,
  },
  rowFocused: { borderColor: T.accent },
  input: {
    flex: 1,
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 15,
    color: T.ink,
  },
});
