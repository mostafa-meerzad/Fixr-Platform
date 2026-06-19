import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize } from '../../constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as IconName)}
      size={22}
      color={focused ? Colors.primary : Colors.textSecondary}
    />
  );
}

export default function ExpertLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bgCard,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: { fontSize: FontSize.xs },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('home'),
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: t('jobs'),
          tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bids"
        options={{
          title: t('alerts'),
          tabBarIcon: ({ focused }) => <TabIcon name="layers" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="credits"
        options={{
          title: t('earnings'),
          tabBarIcon: ({ focused }) => <TabIcon name="wallet" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
