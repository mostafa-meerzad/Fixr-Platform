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

export default function HomeownerLayout() {
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
        name="jobs"
        options={{
          title: t('jobs'),
          tabBarIcon: ({ focused }) => <TabIcon name="briefcase" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('alerts'),
          tabBarIcon: ({ focused }) => <TabIcon name="notifications" focused={focused} />,
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
