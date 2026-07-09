import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, IconSize, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { useNotifStore } from '@/stores/notif.store';

function TabIcon({
  name,
  color,
  hasBadge,
}: {
  name: string;
  color: string;
  hasBadge?: boolean;
}) {
  return (
    <View>
      <MaterialIcons name={name as any} size={IconSize.tab} color={color} />
      {hasBadge ? <View style={styles.badge} /> : null}
    </View>
  );
}

export default function ExpertLayout() {
  const insets = useSafeAreaInsets();
  const hasUnread = useNotifStore((s) => s.unreadChatCount > 0);
  const unreadCount = useNotifStore((s) => s.unreadCount);

  return (
    <View style={styles.root}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary600,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.gray200,
        },
      }}
    >
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color }) => <TabIcon name={Icons.tabBrowse} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-bids"
        options={{
          title: 'My Bids',
          tabBarIcon: ({ color }) => <TabIcon name={Icons.tabBids} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => (
            <TabIcon name={Icons.tabChat} color={color} hasBadge={hasUnread} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name={Icons.tabPerson} color={color} />,
        }}
      />
      <Tabs.Screen name="job/[id]" options={{ href: null }} />
      <Tabs.Screen name="active-job/[id]" options={{ href: null }} />
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
