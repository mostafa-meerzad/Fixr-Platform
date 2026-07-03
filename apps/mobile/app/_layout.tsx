import React, { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { StyleSheet, View, Image } from 'react-native';
import '@/i18n';
import { useAuthStore } from '@/stores/auth.store';
import { useLangStore } from '@/stores/lang.store';
import { ToastProvider } from '@/components/ui/Toast';

SplashScreen.preventAutoHideAsync();

const SPLASH_MIN_MS = 2000;

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const initializeLang = useLangStore((s) => s.initialize);
  const langLoaded = useLangStore((s) => s.langLoaded);
  const startTime = useRef(Date.now());
  const [ready, setReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    initialize();
    initializeLang();
  }, []);

  useEffect(() => {
    if (fontsLoaded && langLoaded) {
      SplashScreen.hideAsync();
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, SPLASH_MIN_MS - elapsed);
      const timer = setTimeout(() => setReady(true), remaining);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, langLoaded]);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <Image
          source={require('../assets/splash.png')}
          style={styles.splashImage}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </ToastProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { flex: 1, backgroundColor: '#F9FAFB' },
  splashImage: { width: '100%', height: '100%' },
});
