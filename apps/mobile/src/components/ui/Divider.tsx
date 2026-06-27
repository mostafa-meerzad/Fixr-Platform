import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

interface DividerProps {
  style?: ViewStyle;
  color?: string;
  spacing?: number;
}

export function Divider({ style, color = Colors.gray200, spacing }: DividerProps) {
  return (
    <View
      style={[
        styles.line,
        { backgroundColor: color },
        spacing !== undefined ? { marginVertical: spacing } : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: 1,
    width: '100%',
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.s3,
  },
});
