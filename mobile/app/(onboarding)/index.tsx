// Onboarding stub — content will be implemented in Task 17 (Gamification + Onboarding)
// This screen is shown once after registration.
// When the user completes onboarding, set AsyncStorage 'hasOnboarded' = 'true'
// and the root layout will redirect to (tabs).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, View } from 'react-native';
import { PrimaryBtn } from '@/components/ui/PrimaryBtn';
import { supabase } from '@/lib/supabase';
import { T } from '@/lib/theme';
import { onboardingKey, useOnboarding } from '../_layout';

export default function OnboardingScreen() {
  const { completeOnboarding } = useOnboarding();

  async function complete() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await AsyncStorage.setItem(onboardingKey(user.id), 'true');
    completeOnboarding();
  }

  return (
    <View style={styles.root}>
      <PrimaryBtn onPress={complete}>Bắt đầu khám phá</PrimaryBtn>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
