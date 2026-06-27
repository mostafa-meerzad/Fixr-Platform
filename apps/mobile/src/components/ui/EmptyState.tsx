import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <MaterialIcons
        name={icon as any}
        size={64}
        color={Colors.gray400}
        style={styles.icon}
      />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.s8,
    paddingVertical: Spacing.s10,
  },
  icon: {
    marginBottom: Spacing.s4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.s2,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.gray400,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 22,
  },
  button: {
    marginTop: Spacing.s6,
    maxWidth: 240,
  },
});
