import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, IconSize, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { useNotifStore } from '@/stores/notif.store';
import { FloatingTabBar } from '@/components/ui/FloatingTabBar';

function TabIcon({
  name,
  color,
  size,
  hasBadge,
}: {
  name: string;
  color: string;
  size: number;
  hasBadge?: boolean;
}) {
  return (
    <View>
      <MaterialIcons name={name as any} size={size} color={color} />
      {hasBadge ? <View style={styles.badge} /> : null}
    </View>
  );
}

export default function HomeownerLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const hasUnread = useNotifStore((s) => s.unreadChatCount > 0);
  const unreadCount = useNotifStore((s) => s.unreadCount);

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <FloatingTabBar {...props} />}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t('homeowner.home.tabLabel'),
            tabBarIcon: ({ color, size }) => (
              <TabIcon name={Icons.tabHome} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="my-jobs"
          options={{
            title: t('homeowner.myJobs.title'),
            tabBarIcon: ({ color, size }) => (
              <TabIcon name={Icons.tabWork} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: t('homeowner.messages.title'),
            tabBarIcon: ({ color, size }) => (
              <TabIcon name={Icons.tabChat} color={color} size={size} hasBadge={hasUnread} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('homeowner.profile.title'),
            tabBarIcon: ({ color, size }) => (
              <TabIcon name={Icons.tabPerson} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen name="disputes" options={{ href: null }} />
        <Tabs.Screen name="expert/[id]" options={{ href: null }} />
        <Tabs.Screen name="job/[id]" options={{ href: null }} />
        <Tabs.Screen name="active-job/[id]" options={{ href: null }} />
        <Tabs.Screen name="post/create" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="post/details" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="post/media" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="post/review" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="post/success" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      </Tabs>
      <TouchableOpacity
        style={[styles.bell, { top: insets.top + 8 }]}
        onPress={() => router.push('/(shared)/notifications' as any)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons
          name={(unreadCount > 0 ? Icons.notifsActive : Icons.notifs) as any}
          size={24}
          color={Colors.primary600}
        />
        {unreadCount > 0 && <View style={styles.bellDot} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger600,
  },
  bell: {
    position: 'absolute',
    right: Spacing.s4,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger600,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
});
