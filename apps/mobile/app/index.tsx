import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { Colors } from '@/constants/theme';

export default function Index() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary600} />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/phone" />;
  if (user.role === 'HOMEOWNER') return <Redirect href="/(homeowner)/home" />;
  return <Redirect href="/(expert)/browse" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgApp,
  },
});
