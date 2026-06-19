import React from 'react';
import { ScrollView, View, StyleSheet, ViewStyle, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function ScreenWrapper({
  children,
  scroll = false,
  padded = true,
  style,
  refreshing,
  onRefresh,
}: Props) {
  const inner = padded ? [styles.inner, style] : [style];

  if (scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={inner}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing ?? false}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.flex, ...inner]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1, backgroundColor: Colors.bg },
  flex:   { flex: 1 },
  inner:  { padding: Spacing.lg, gap: Spacing.md },
});
