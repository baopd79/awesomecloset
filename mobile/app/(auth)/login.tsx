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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Đăng nhập thất bại', error.message);
    // On success, root layout will redirect to tabs via onAuthStateChange
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

          <Text style={styles.title}>
            Chào mừng <Text style={styles.titleItalic}>trở lại</Text>
          </Text>
          <Text style={styles.sub}>Đăng nhập để tiếp tục phối đồ</Text>

          <View style={styles.fields}>
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

          <Pressable style={styles.forgotRow}>
            <Text style={styles.forgot}>Quên mật khẩu?</Text>
          </Pressable>

          <PrimaryBtn style={styles.btnFull} onPress={handleLogin} disabled={loading}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </PrimaryBtn>

          <Divider />
          <SocialRow />

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Chưa có tài khoản? </Text>
            <Pressable onPress={() => router.replace('/(auth)/register')}>
              <Text style={styles.switchLink}>Đăng ký ngay</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Divider() {
  return (
    <View style={divStyles.row}>
      <View style={divStyles.line} />
      <Text style={divStyles.label}>hoặc</Text>
      <View style={divStyles.line} />
    </View>
  );
}

function SocialRow() {
  return (
    <View style={socialStyles.row}>
      <Pressable style={socialStyles.btn}>
        <Text style={socialStyles.label}>Google</Text>
      </Pressable>
      <Pressable style={socialStyles.btn}>
        <Text style={socialStyles.label}>Apple</Text>
      </Pressable>
    </View>
  );
}

const divStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: T.line },
  label: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 12, color: T.faint },
});

const socialStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: T.rsm,
    borderWidth: 1.5,
    borderColor: T.line,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 14.5, color: T.ink },
});

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
  titleItalic: { fontFamily: 'PlayfairDisplay_700Bold_Italic' },
  sub: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 14,
    color: T.sub,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 26,
  },
  fields: { width: '100%' },
  forgotRow: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 8 },
  forgot: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 13,
    color: T.accent,
  },
  btnFull: { width: '100%', marginTop: 8 },
  switchRow: { flexDirection: 'row', marginTop: 24 },
  switchText: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 14, color: T.sub },
  switchLink: { fontFamily: 'BeVietnamPro_700Bold', fontSize: 14, color: T.accent },
});
