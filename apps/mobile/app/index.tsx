import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { Colors } from '@/constants/theme';

export default function Index() {
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace('/(auth)/phone');
    else if (user.role === 'HOMEOWNER') router.replace('/(homeowner)/home');
    else router.replace('/(expert)/browse');
  }, [isLoading, user]);

  return <View style={styles.bg} />;
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#FFF6ED' },
});
