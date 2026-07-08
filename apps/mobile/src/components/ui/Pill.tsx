import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

export type PillVariant = 'primary' | 'info' | 'warning' | 'success' | 'gray' | 'danger';

interface PillProps {
  label: string;
  variant?: PillVariant;
  style?: ViewStyle;
}

const variantColors: Record<PillVariant, { bg: string; text: string }> = {
  primary: { bg: Colors.primary100, text: Colors.primary600 },
  info:    { bg: Colors.info100,    text: Colors.info600    },
  warning: { bg: Colors.warning100, text: Colors.warning600 },
  success: { bg: Colors.success100, text: Colors.success600 },
  gray:    { bg: Colors.gray100,    text: Colors.gray600    },
  danger:  { bg: Colors.danger100,  text: Colors.danger600  },
};

export function Pill({ label, variant = 'primary', style }: PillProps) {
  const { bg, text } = variantColors[variant];
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

// Maps job status strings to Pill variants
export function getStatusVariant(status: string): PillVariant {
  switch (status) {
    case 'OPEN':                  return 'primary';
    case 'ASSIGNED':
    case 'EN_ROUTE':              return 'info';
    case 'ARRIVED':
    case 'IN_PROGRESS':
    case 'COMPLETION_REQUESTED':  return 'warning';
    case 'COMPLETED':             return 'success';
    case 'CANCELLED':             return 'gray';
    case 'DISPUTED':              return 'danger';
    default:                      return 'gray';
  }
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.s3 - 2, // 10px
    borderRadius: Radius.full,
    // alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
