import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BrandMark } from '@/components/ui/BrandMark';
import { EyeToggle, Field } from '@/components/ui/Field';
import { IconBtn } from '@/components/ui/IconBtn';
import { PrimaryBtn } from '@/components/ui/PrimaryBtn';
import { supabase } from '@/lib/supabase';
import { T } from '@/lib/theme';
import { ONBOARDING_KEY } from '../_layout';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Đăng ký thất bại', error.message);
      return;
    }
    // Mark onboarding as NOT completed — root layout will route to (onboarding)
    await AsyncStorage.setItem(ONBOARDING_KEY, 'false');
    // onAuthStateChange fires → root layout redirects to (onboarding)
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.backRow}>
          <IconBtn name="back" onPress={() => router.back()} />
        </View>

        <View style={styles.form}>
          <BrandMark size={56} />

          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.sub}>Bắt đầu số hóa tủ đồ của bạn</Text>

          <View style={styles.fields}>
            <Field
              icon="user"
              label="Họ và tên"
              value={name}
              onChangeText={setName}
              placeholder="Nguyễn Khánh Linh"
            />
            <Field
              icon="mail"
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="ban@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              icon="lock"
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPw}
              autoCapitalize="none"
              trailing={<EyeToggle show={showPw} onToggle={() => setShowPw((s) => !s)} />}
            />
          </View>

          <PrimaryBtn style={styles.btnFull} onPress={handleRegister} disabled={loading}>
            {loading ? 'Đang đăng ký…' : 'Đăng ký'}
          </PrimaryBtn>

          <Text style={styles.terms}>
            Khi đăng ký, bạn đồng ý với{' '}
            <Text style={styles.termsLink}>Điều khoản</Text>
            {' & '}
            <Text style={styles.termsLink}>Chính sách riêng tư</Text>.
          </Text>

          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divLabel}>hoặc</Text>
            <View style={styles.divLine} />
          </View>

          <View style={styles.socialRow}>
            <Pressable style={styles.socialBtn}>
              <Text style={styles.socialLabel}>Google</Text>
            </Pressable>
            <Pressable style={styles.socialBtn}>
              <Text style={styles.socialLabel}>Apple</Text>
            </Pressable>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Đã có tài khoản? </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.switchLink}>Đăng nhập</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { flexGrow: 1 },
  backRow: { paddingTop: 54, paddingHorizontal: 16 },
  form: { paddingHorizontal: 32, paddingTop: 24, paddingBottom: 40, alignItems: 'center' },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    color: T.ink,
    letterSpacing: -0.5,
    marginTop: 22,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 14,
    color: T.sub,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 26,
  },
  fields: { width: '100%' },
  btnFull: { width: '100%', marginTop: 8 },
  terms: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 11.5,
    lineHeight: 18,
    color: T.faint,
    textAlign: 'center',
    marginTop: 14,
  },
  termsLink: { fontFamily: 'BeVietnamPro_600SemiBold', color: T.sub },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18, width: '100%' },
  divLine: { flex: 1, height: 1, backgroundColor: T.line },
  divLabel: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 12, color: T.faint },
  socialRow: { flexDirection: 'row', gap: 10, width: '100%' },
  socialBtn: {
    flex: 1,
    height: 50,
    borderRadius: T.rsm,
    borderWidth: 1.5,
    borderColor: T.line,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialLabel: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 14.5, color: T.ink },
  switchRow: { flexDirection: 'row', marginTop: 24 },
  switchText: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 14, color: T.sub },
  switchLink: { fontFamily: 'BeVietnamPro_700Bold', fontSize: 14, color: T.accent },
});
