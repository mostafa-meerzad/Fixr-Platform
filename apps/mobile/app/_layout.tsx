import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { usersService } from '@/services/users.service';
import { UserRole } from '@fixr/shared';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SPLASH_MIN_MS = 2000;

function navigateToNotification(
  data: Record<string, string>,
  role: UserRole | undefined,
) {
  const { type, jobId, channel_id } = data ?? {};

  // Stream Chat push: type = "message.new", channel_id = "job-<jobId>"
  if (type === 'message.new') {
    const match = (channel_id ?? '').match(/^(?:messaging:)?job-(.+)$/);
    if (match) router.push(`/(shared)/chat/${match[1]}` as any);
    return;
  }

  switch (type) {
    case 'BID_RECEIVED':
      if (jobId) router.push(`/(homeowner)/job/${jobId}` as any);
      break;
    case 'JOB_POSTED':
      if (jobId) router.push(`/(expert)/job/${jobId}` as any);
      break;
    case 'BID_ACCEPTED':
    case 'JOB_COMPLETED':
      if (jobId) router.push(`/(expert)/active-job/${jobId}` as any);
      break;
    case 'EXPERT_EN_ROUTE':
    case 'EXPERT_ARRIVED':
    case 'COMPLETION_REQUESTED':
      if (jobId) router.push(`/(homeowner)/active-job/${jobId}` as any);
      break;
    case 'JOB_CANCELLED':
      if (role === UserRole.EXPERT) router.push('/(expert)/my-bids' as any);
      else router.push('/(homeowner)/my-jobs' as any);
      break;
    case 'VERIFICATION_APPROVED':
      router.push('/(expert)/browse' as any);
      break;
    case 'VERIFICATION_REJECTED':
      router.push('/(expert)/profile' as any);
      break;
    default:
      // Unknown or legacy type — no navigation
      break;
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
  const setUnreadChatCount = useNotifStore((s) => s.setUnreadChatCount);
  const incrementUnreadChat = useNotifStore((s) => s.incrementUnreadChat);
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

  // Register FCM token + sync language to backend when user logs in.
  // Language sync ensures FCM notifications arrive in the correct language —
  // the backend selects title/body based on user.language in the DB.
  useEffect(() => {
    if (!user) return;
    notificationsService.registerPushToken().catch(() => {});
    usersService.updateMe({ language: 'en' }).catch(() => {});
  }, [user?.id]);

  const syncUnreadCounts = useCallback(() => {
    if (!user) return;
    notificationsService
      .list(1, 50)
      .then((res) => {
        setUnreadCount(res.data?.unreadCount ?? 0);
        const notifs: Array<{ type: string; isRead: boolean }> = res.data?.data ?? [];
        const chatUnread = notifs.filter((n) => !n.isRead && n.type === 'NEW_MESSAGE').length;
        setUnreadChatCount(chatUnread);
      })
      .catch(() => {});
  }, [user?.id]);

  // Load initial unread counts when user logs in
  useEffect(() => {
    syncUnreadCounts();
  }, [user?.id]);

  // Handle app coming to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        bumpProfileRefresh();
        syncUnreadCounts();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [user]);

  // Foreground notification received → bump unread badge
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const type = notification.request.content.data?.type as string | undefined;
      if (type === 'NEW_MESSAGE' || type === 'message.new') {
        incrementUnreadChat();
      } else {
        incrementUnread();
      }
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
