import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, View, Image } from 'react-native';
import { Stack, router } from 'expo-router';
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
import * as Notifications from 'expo-notifications';
import '@/i18n';
import { useAuthStore } from '@/stores/auth.store';
import { useLangStore } from '@/stores/lang.store';
import { useNotifStore } from '@/stores/notif.store';
import { ToastProvider } from '@/components/ui/Toast';
import { notificationsService } from '@/services/notifications.service';
import { UserRole } from '@fixr/shared';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SPLASH_MIN_MS = 2000;

function navigateToNotification(
  data: Record<string, string>,
  role: UserRole | undefined,
) {
  const jobId = data?.jobId;
  if (!jobId) return;

  if (role === UserRole.HOMEOWNER) {
    router.push(`/(homeowner)/job/${jobId}` as any);
  } else if (role === UserRole.EXPERT) {
    router.push(`/(expert)/job/${jobId}` as any);
  }
}

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const user = useAuthStore((s) => s.user);
  const bumpProfileRefresh = useAuthStore((s) => s.bumpProfileRefresh);
  const initializeLang = useLangStore((s) => s.initialize);
  const langLoaded = useLangStore((s) => s.langLoaded);
  const setUnreadCount = useNotifStore((s) => s.setUnreadCount);
  const incrementUnread = useNotifStore((s) => s.increment);
  const startTime = useRef(Date.now());
  const [ready, setReady] = useState(false);
  const appState = useRef(AppState.currentState);

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

  // Register FCM token once user is authenticated
  useEffect(() => {
    if (user) {
      notificationsService.registerPushToken().catch(() => {});
    }
  }, [user?.id]);

  // Load initial unread count when user logs in
  useEffect(() => {
    if (!user) return;
    notificationsService
      .list(1, 1)
      .then((res) => setUnreadCount(res.data?.unreadCount ?? 0))
      .catch(() => {});
  }, [user?.id]);

  // Handle app coming to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        bumpProfileRefresh();
        if (user) {
          notificationsService
            .list(1, 1)
            .then((res) => setUnreadCount(res.data?.unreadCount ?? 0))
            .catch(() => {});
        }
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [user]);

  // Foreground notification received → bump unread badge
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      incrementUnread();
      bumpProfileRefresh();
    });
    return () => sub.remove();
  }, []);

  // Notification tap → navigate to relevant screen
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      navigateToNotification(data, user?.role);
    });
    return () => sub.remove();
  }, [user?.role]);

  // Handle cold-start notification tap (app launched from a notification)
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response || !user) return;
      const data = response.notification.request.content.data as Record<string, string>;
      navigateToNotification(data, user.role);
    });
  }, [user?.id]);

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
