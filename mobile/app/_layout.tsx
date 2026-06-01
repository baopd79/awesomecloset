import {
  BeVietnamPro_400Regular,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  useFonts,
} from '@expo-google-fonts/be-vietnam-pro';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';

interface OnboardingCtx { completeOnboarding: () => void }
const OnboardingContext = createContext<OnboardingCtx>({ completeOnboarding: () => {} });
export function useOnboarding() { return useContext(OnboardingContext); }

SplashScreen.preventAutoHideAsync();

export function onboardingKey(userId: string) {
  return `hasOnboarded:${userId}`;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    BeVietnamPro_400Regular,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });

  const { session, loading: sessionLoading } = useSession();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (sessionLoading) return;
    const key = session ? onboardingKey(session.user.id) : null;
    if (!key) {
      setHasOnboarded(false);
      return;
    }
    AsyncStorage.getItem(key).then((val) => {
      setHasOnboarded(val === 'true');
    });
  }, [session, sessionLoading]);

  const ready = fontsLoaded && !sessionLoading && hasOnboarded !== null;

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync();

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs = segments[0] === '(tabs)';

    if (!session) {
      if (!inAuth) router.replace('/(auth)');
    } else if (!hasOnboarded) {
      if (!inOnboarding) router.replace('/(onboarding)');
    } else {
      if (!inTabs) router.replace('/(tabs)');
    }
  }, [ready, session, hasOnboarded, segments, router]);

  if (!ready) return null;

  return (
    <OnboardingContext.Provider value={{ completeOnboarding: () => setHasOnboarded(true) }}>
      <Slot />
    </OnboardingContext.Provider>
  );
}
